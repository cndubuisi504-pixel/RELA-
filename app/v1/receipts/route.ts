import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { validateApiKey, getServiceSupabase } from "@/lib/api/auth";
import { generateReceiptPdf } from "@/lib/api/receipt-pdf";

export const dynamic = "force-dynamic";

interface ReceiptItemInput {
  name: string;
  description?: string | null;
  size?: string | null;
  colour?: string | null;
  color?: string | null;
  quantity: number;
  unit_price: number;
}

interface ReceiptChargeInput {
  name: string;
  amount: number;
}

interface CreateReceiptRequestBody {
  business?: {
    name?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  customer?: {
    name?: string;
    email?: string | null;
    phone?: string | null;
  };
  order_number?: string | null;
  items?: ReceiptItemInput[];
  charges?: ReceiptChargeInput[];
  discount?: number;
  tax?: number;
  currency?: string;
  total_amount?: number;
  total?: number;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_status?: string | null;
  purchase_date?: string | null;
}

export async function POST(req: NextRequest) {
  // 1. Authenticate request via API Key
  const auth = await validateApiKey(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
        message: auth.message,
        ...(auth.retryAfter ? { retry_after: auth.retryAfter } : {}),
      },
      { status: auth.status }
    );
  }

  // 2. Parse request JSON
  let body: CreateReceiptRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "invalid_json",
        message: "Request body must be valid JSON.",
      },
      { status: 400 }
    );
  }

  // 3. Validate missing fields
  const missingFields: string[] = [];

  if (!body.business || typeof body.business !== "object") {
    missingFields.push("business");
  } else if (!body.business.name || typeof body.business.name !== "string" || !body.business.name.trim()) {
    missingFields.push("business.name");
  }

  if (!body.customer || typeof body.customer !== "object") {
    missingFields.push("customer");
  } else if (!body.customer.name || typeof body.customer.name !== "string" || !body.customer.name.trim()) {
    missingFields.push("customer.name");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    missingFields.push("items");
  }

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "missing_fields",
        message: `Missing required field(s): ${missingFields.join(", ")}`,
        fields: missingFields,
      },
      { status: 422 }
    );
  }

  // 4. Validate items and amounts
  const items = body.items!;
  let itemsSubtotal = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.name || typeof item.name !== "string" || !item.name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "missing_fields",
          message: `Item at index ${i} is missing a valid name.`,
          fields: [`items[${i}].name`],
        },
        { status: 422 }
      );
    }

    const qty = Number(item.quantity);
    const unitPrice = Number(item.unit_price);

    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_amounts",
          message: `Item at index ${i} ("${item.name}") has invalid quantity: ${item.quantity}. Must be > 0.`,
          fields: [`items[${i}].quantity`],
        },
        { status: 422 }
      );
    }

    if (isNaN(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_amounts",
          message: `Item at index ${i} ("${item.name}") has invalid unit_price: ${item.unit_price}. Must be >= 0.`,
          fields: [`items[${i}].unit_price`],
        },
        { status: 422 }
      );
    }

    itemsSubtotal += qty * unitPrice;
  }

  // Validate charges
  let chargesTotal = 0;
  const sanitizedCharges: ReceiptChargeInput[] = [];
  if (Array.isArray(body.charges)) {
    for (let c = 0; c < body.charges.length; c++) {
      const charge = body.charges[c];
      const amount = Number(charge.amount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "invalid_amounts",
            message: `Charge at index ${c} has invalid amount: ${charge.amount}. Must be >= 0.`,
            fields: [`charges[${c}].amount`],
          },
          { status: 422 }
        );
      }
      chargesTotal += amount;
      sanitizedCharges.push({
        name: charge.name || "Delivery Charge",
        amount,
      });
    }
  }

  // Validate discount and tax
  const discount = Number(body.discount || 0);
  if (isNaN(discount) || discount < 0) {
    return NextResponse.json(
      {
        success: false,
        error: "invalid_amounts",
        message: "Discount must be a non-negative number.",
        fields: ["discount"],
      },
      { status: 422 }
    );
  }

  const tax = Number(body.tax || 0);
  if (isNaN(tax) || tax < 0) {
    return NextResponse.json(
      {
        success: false,
        error: "invalid_amounts",
        message: "Tax must be a non-negative number.",
        fields: ["tax"],
      },
      { status: 422 }
    );
  }

  const computedTotal = Math.round((itemsSubtotal + chargesTotal - discount + tax) * 100) / 100;
  if (computedTotal < 0) {
    return NextResponse.json(
      {
        success: false,
        error: "invalid_amounts",
        message: "Calculated receipt total cannot be negative.",
      },
      { status: 422 }
    );
  }

  // Check client supplied total_amount or total
  const declaredTotal = body.total_amount !== undefined ? Number(body.total_amount) : (body.total !== undefined ? Number(body.total) : undefined);
  if (declaredTotal !== undefined && !isNaN(declaredTotal)) {
    if (Math.abs(declaredTotal - computedTotal) > 0.05) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_amounts",
          message: `Total amount mismatch: expected ${computedTotal}, but received ${declaredTotal}.`,
          expected_total: computedTotal,
          received_total: declaredTotal,
        },
        { status: 422 }
      );
    }
  }

  // 5. Generate secure identifiers
  const receiptId = `rec_${crypto.randomBytes(12).toString("hex")}`;
  const downloadToken = crypto.randomBytes(20).toString("hex");
  const publicToken = crypto.randomBytes(16).toString("hex");

  // Determine current date & sequential receipt number: REC-YYYYMMDD-0001
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const purchaseDate = body.purchase_date ? new Date(body.purchase_date).toISOString() : now.toISOString();

  const supabase = getServiceSupabase();

  // Find daily sequence count for today
  const dayPrefix = `REC-${dateStr}-%`;
  const { count } = await supabase
    .from("api_receipts")
    .select("id", { count: "exact", head: true })
    .like("receipt_number", dayPrefix);

  const seq = (count || 0) + 1;
  const receiptNumber = `REC-${dateStr}-${String(seq).padStart(4, "0")}`;

  // URLs
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "rela-iota-eight.vercel.app";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const verificationUrl = `${origin}/r/${publicToken}`;
  // We attach ?token=<downloadToken> so the storefront can place it directly behind a button without exposing master keys
  const pdfDownloadUrl = `${origin}/v1/receipts/${receiptId}/download?token=${downloadToken}`;

  const currency = (body.currency || "NGN").toUpperCase();
  const paymentStatus = (body.payment_status || "paid").toLowerCase();

  // 6. Generate the PDF
  const sanitizedItems = items.map((it) => ({
    name: it.name.trim(),
    description: it.description?.trim() || null,
    size: it.size?.trim() || null,
    colour: (it.colour || it.color)?.trim() || null,
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    total: Number(it.quantity) * Number(it.unit_price),
  }));

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateReceiptPdf({
      receiptId,
      receiptNumber,
      orderNumber: body.order_number?.trim() || null,
      business: {
        name: body.business!.name!.trim(),
        address: body.business!.address?.trim() || null,
        phone: body.business!.phone?.trim() || null,
        email: body.business!.email?.trim() || null,
      },
      customer: {
        name: body.customer!.name!.trim(),
        email: body.customer!.email?.trim() || null,
        phone: body.customer!.phone?.trim() || null,
      },
      items: sanitizedItems,
      charges: sanitizedCharges,
      discount,
      tax,
      currency,
      total: computedTotal,
      paymentMethod: body.payment_method?.trim() || null,
      paymentReference: body.payment_reference?.trim() || null,
      paymentStatus,
      purchaseDate,
      verificationUrl,
    });
  } catch (pdfErr) {
    console.error("PDF Generation error:", pdfErr);
    return NextResponse.json(
      {
        success: false,
        error: "pdf_generation_failed",
        message: "Failed to generate receipt PDF.",
      },
      { status: 500 }
    );
  }

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  // 7. Store in api_receipts table
  const { error: insertError } = await supabase.from("api_receipts").insert({
    id: receiptId,
    api_key_id: auth.keyId === "master_env_key" ? null : auth.keyId,
    receipt_number: receiptNumber,
    order_number: body.order_number?.trim() || null,
    business_name: body.business!.name!.trim(),
    business_address: body.business!.address?.trim() || null,
    business_phone: body.business!.phone?.trim() || null,
    business_email: body.business!.email?.trim() || null,
    customer_name: body.customer!.name!.trim(),
    customer_email: body.customer!.email?.trim() || null,
    customer_phone: body.customer!.phone?.trim() || null,
    items: sanitizedItems,
    charges: sanitizedCharges,
    discount,
    tax,
    total_amount: computedTotal,
    currency,
    payment_method: body.payment_method?.trim() || null,
    payment_reference: body.payment_reference?.trim() || null,
    payment_status: paymentStatus,
    purchase_date: purchaseDate,
    verification_url: verificationUrl,
    public_token: publicToken,
    download_token: downloadToken,
    pdf_base64: pdfBase64,
  });

  if (insertError) {
    console.error("Database insert error:", insertError);
    return NextResponse.json(
      {
        success: false,
        error: "database_error",
        message: `Failed to save receipt record: ${insertError.message}`,
      },
      { status: 500 }
    );
  }

  // 8. Return success response matching specification exactly
  return NextResponse.json(
    {
      success: true,
      receipt: {
        id: receiptId,
        number: receiptNumber,
        status: paymentStatus,
        total: computedTotal,
        currency,
        verification_url: verificationUrl,
        pdf_download_url: pdfDownloadUrl,
      },
    },
    { status: 201 }
  );
}
