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
  reference?: string | null;
  customer?: {
    name?: string;
    email?: string | null;
    phone?: string | null;
  };
  business?: {
    name?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  items?: ReceiptItemInput[];
  delivery_fee?: number;
  charges?: ReceiptChargeInput[];
  discount?: number;
  tax?: number;
  total?: number;
  total_amount?: number;
  currency?: string;
  payment?: {
    method?: string | null;
    channel?: string | null;
    paid_at?: string | null;
  };
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_status?: string | null;
  purchase_date?: string | null;
  order_number?: string | null;
}

/**
 * GET /v1/receipts?reference=...
 * Query receipts by reference or list recent receipts
 */
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: auth.error, message: auth.message } },
      { status: auth.status }
    );
  }

  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json(
      { error: { code: "missing_query", message: "Query parameter 'reference' is required." } },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();
  let query = supabase.from("api_receipts").select("*").eq("payment_reference", reference.trim());

  if (auth.keyId !== "master_env_key" && auth.businessId) {
    query = query.eq("business_id", auth.businessId);
  }

  const { data: receipt, error } = await query.maybeSingle();

  if (error || !receipt) {
    return NextResponse.json(
      { error: { code: "not_found", message: `Receipt with reference '${reference}' not found.` } },
      { status: 404 }
    );
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "rela-iota-eight.vercel.app";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const pdfUrl = `${origin}/v1/receipts/${receipt.id}/pdf?token=${receipt.download_token}`;

  return NextResponse.json({
    id: receipt.id,
    receipt_number: receipt.receipt_number,
    reference: receipt.payment_reference,
    status: receipt.receipt_status || "ready",
    customer: {
      name: receipt.customer_name,
      email: receipt.customer_email,
      phone: receipt.customer_phone,
    },
    items: receipt.items,
    charges: receipt.charges,
    discount: receipt.discount,
    tax: receipt.tax,
    total: receipt.total_amount,
    currency: receipt.currency,
    payment: {
      method: receipt.payment_method,
      reference: receipt.payment_reference,
      status: receipt.payment_status,
      paid_at: receipt.purchase_date,
    },
    verification_url: receipt.verification_url,
    pdf_url: pdfUrl,
    is_test: receipt.is_test,
    created_at: receipt.created_at,
  });
}

/**
 * POST /v1/receipts
 * Create a receipt with reference idempotency, test mode detection, and PDF generation
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate request via API Key
  const auth = await validateApiKey(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: auth.error, message: auth.message } },
      { status: auth.status }
    );
  }

  // 2. Parse request JSON
  let body: CreateReceiptRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  // 3. Extract reference and enforce idempotency
  const reference = (body.reference || body.payment_reference || body.order_number)?.trim();
  const supabase = getServiceSupabase();
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "rela-iota-eight.vercel.app";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  if (reference) {
    // Check if receipt already exists with this reference
    const { data: existing } = await supabase
      .from("api_receipts")
      .select("*")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existing) {
      // Idempotency: return existing receipt immediately
      const existingPdfUrl = `${origin}/v1/receipts/${existing.id}/pdf?token=${existing.download_token}`;
      return NextResponse.json(
        {
          id: existing.id,
          receipt_number: existing.receipt_number,
          status: existing.receipt_status || "ready",
          verification_url: existing.verification_url,
          pdf_url: existingPdfUrl,
          created_at: existing.created_at,
        },
        { status: 200 }
      );
    }
  }

  // 4. Validate required customer and items fields
  if (!body.customer || typeof body.customer !== "object" || !body.customer.name?.trim()) {
    return NextResponse.json(
      { error: { code: "missing_fields", message: "Missing required field: customer.name" } },
      { status: 422 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: { code: "missing_fields", message: "items must be a non-empty array." } },
      { status: 422 }
    );
  }

  // 5. Validate items, delivery, discount, and total
  let itemsSum = 0;
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (!item.name?.trim()) {
      return NextResponse.json(
        { error: { code: "missing_fields", message: `items[${i}].name is required.` } },
        { status: 422 }
      );
    }
    const qty = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    if (isNaN(qty) || qty <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      return NextResponse.json(
        { error: { code: "invalid_amounts", message: `Invalid quantity or unit_price for item '${item.name}'.` } },
        { status: 422 }
      );
    }
    itemsSum += qty * unitPrice;
  }

  let deliveryAmount = 0;
  if (body.delivery_fee !== undefined) {
    deliveryAmount = Number(body.delivery_fee);
  } else if (Array.isArray(body.charges)) {
    for (const c of body.charges) {
      deliveryAmount += Number(c.amount || 0);
    }
  }

  if (isNaN(deliveryAmount) || deliveryAmount < 0) {
    return NextResponse.json(
      { error: { code: "invalid_amounts", message: "delivery_fee must be non-negative." } },
      { status: 422 }
    );
  }

  const discount = Number(body.discount || 0);
  if (isNaN(discount) || discount < 0) {
    return NextResponse.json(
      { error: { code: "invalid_amounts", message: "discount must be non-negative." } },
      { status: 422 }
    );
  }

  const tax = Number(body.tax || 0);
  const calculatedTotal = Math.round((itemsSum + deliveryAmount - discount + tax) * 100) / 100;

  const declaredTotal = body.total !== undefined ? Number(body.total) : (body.total_amount !== undefined ? Number(body.total_amount) : undefined);

  if (declaredTotal !== undefined) {
    if (Math.abs(declaredTotal - calculatedTotal) > 0.05) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_total",
            message: "total must equal items + delivery - discount",
          },
        },
        { status: 422 }
      );
    }
  }

  const finalTotal = declaredTotal !== undefined ? declaredTotal : calculatedTotal;
  const isKobo = finalTotal >= 100000 && Number.isInteger(finalTotal);

  // 6. Generate secure identifiers
  const receiptId = `rec_${crypto.randomBytes(12).toString("hex")}`;
  const downloadToken = crypto.randomBytes(20).toString("hex");
  const publicToken = crypto.randomBytes(16).toString("hex");

  // Determine current date & sequential receipt number: REL-YYYYMMDD-0001
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const purchaseDate = body.payment?.paid_at || body.purchase_date || now.toISOString();

  const dayPrefix = `REL-${dateStr}-%`;
  const { count } = await supabase
    .from("api_receipts")
    .select("id", { count: "exact", head: true })
    .like("receipt_number", dayPrefix);

  const seq = (count || 0) + 1;
  const receiptNumber = `REL-${dateStr}-${String(seq).padStart(4, "0")}`;

  const verificationUrl = `${origin}/r/${publicToken}`;
  const pdfUrl = `${origin}/v1/receipts/${receiptId}/pdf?token=${downloadToken}`;
  const currency = (body.currency || "NGN").toUpperCase();

  const businessName = body.business?.name?.trim() || auth.name || "Merchant Store";

  const sanitizedItems = body.items.map((it) => ({
    name: it.name.trim(),
    description: it.description?.trim() || null,
    size: it.size?.trim() || null,
    colour: (it.colour || it.color)?.trim() || null,
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    total: Number(it.quantity) * Number(it.unit_price),
  }));

  const sanitizedCharges = Array.isArray(body.charges) && body.charges.length > 0
    ? body.charges
    : (deliveryAmount > 0 ? [{ name: "Delivery Fee", amount: deliveryAmount }] : []);

  // 7. Generate PDF synchronously
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateReceiptPdf({
      receiptId,
      receiptNumber,
      orderNumber: reference || null,
      business: {
        name: businessName,
        address: body.business?.address?.trim() || null,
        phone: body.business?.phone?.trim() || null,
        email: body.business?.email?.trim() || null,
      },
      customer: {
        name: body.customer.name.trim(),
        email: body.customer.email?.trim() || null,
        phone: body.customer.phone?.trim() || null,
      },
      items: sanitizedItems,
      charges: sanitizedCharges,
      deliveryFee: deliveryAmount,
      discount,
      tax,
      currency,
      total: finalTotal,
      paymentMethod: body.payment?.method || body.payment_method || "card",
      paymentChannel: body.payment?.channel || null,
      paymentReference: reference || null,
      paymentStatus: body.payment_status || "paid",
      purchaseDate,
      verificationUrl,
      isTest: auth.isTest,
      isKobo,
    });
  } catch (pdfErr) {
    console.error("PDF generation failure:", pdfErr);
    return NextResponse.json(
      { error: { code: "pdf_generation_failed", message: "Failed to generate receipt PDF." } },
      { status: 500 }
    );
  }

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  // 8. Persist to api_receipts
  const { error: insertError } = await supabase.from("api_receipts").insert({
    id: receiptId,
    api_key_id: auth.keyId === "master_env_key" ? null : auth.keyId,
    receipt_number: receiptNumber,
    order_number: reference || null,
    business_name: businessName,
    business_address: body.business?.address?.trim() || null,
    business_phone: body.business?.phone?.trim() || null,
    business_email: body.business?.email?.trim() || null,
    customer_name: body.customer.name.trim(),
    customer_email: body.customer.email?.trim() || null,
    customer_phone: body.customer.phone?.trim() || null,
    items: sanitizedItems,
    charges: sanitizedCharges,
    discount,
    tax,
    total_amount: finalTotal,
    currency,
    payment_method: body.payment?.method || body.payment_method || "card",
    payment_reference: reference || null,
    payment_status: body.payment_status || "paid",
    purchase_date: purchaseDate,
    verification_url: verificationUrl,
    public_token: publicToken,
    download_token: downloadToken,
    pdf_base64: pdfBase64,
    is_test: auth.isTest,
    receipt_status: "ready",
  });

  if (insertError) {
    console.error("Database persistence error:", insertError);
    return NextResponse.json(
      { error: { code: "database_error", message: "Failed to save receipt record." } },
      { status: 500 }
    );
  }

  // 9. Return exact response format specified
  return NextResponse.json(
    {
      id: receiptId,
      receipt_number: receiptNumber,
      status: "ready",
      verification_url: verificationUrl,
      pdf_url: pdfUrl,
      created_at: now.toISOString(),
    },
    { status: 201 }
  );
}
