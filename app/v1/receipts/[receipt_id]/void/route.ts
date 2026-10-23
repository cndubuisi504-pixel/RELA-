import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getServiceSupabase } from "@/lib/api/auth";
import { generateReceiptPdf } from "@/lib/api/receipt-pdf";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ receipt_id: string }> }
) {
  const auth = await validateApiKey(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: { code: auth.error, message: auth.message } },
      { status: auth.status }
    );
  }

  const { receipt_id } = await params;
  if (!receipt_id) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Receipt ID is required." } },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();
  const { data: receipt, error } = await supabase
    .from("api_receipts")
    .select("*")
    .eq("id", receipt_id)
    .single();

  if (error || !receipt) {
    return NextResponse.json(
      { error: { code: "not_found", message: `Receipt ${receipt_id} not found.` } },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // Regenerate PDF with void status
  let newPdfBase64: string | null = null;
  try {
    const isKobo = Number(receipt.total_amount) >= 100000 && Number.isInteger(Number(receipt.total_amount));
    const pdfBytes = await generateReceiptPdf({
      receiptId: receipt.id,
      receiptNumber: receipt.receipt_number,
      orderNumber: receipt.order_number,
      business: {
        name: receipt.business_name,
        address: receipt.business_address,
        phone: receipt.business_phone,
        email: receipt.business_email,
      },
      customer: {
        name: receipt.customer_name,
        email: receipt.customer_email,
        phone: receipt.customer_phone,
      },
      items: receipt.items || [],
      charges: receipt.charges || [],
      discount: Number(receipt.discount || 0),
      tax: Number(receipt.tax || 0),
      currency: receipt.currency || "NGN",
      total: Number(receipt.total_amount || 0),
      paymentMethod: receipt.payment_method,
      paymentReference: receipt.payment_reference,
      paymentStatus: "void",
      purchaseDate: receipt.purchase_date || receipt.created_at,
      verificationUrl: receipt.verification_url,
      isTest: receipt.is_test,
      isVoid: true,
      isKobo,
    });
    newPdfBase64 = Buffer.from(pdfBytes).toString("base64");
  } catch (e) {
    console.error("Failed to regenerate void PDF:", e);
  }

  const { error: updateError } = await supabase
    .from("api_receipts")
    .update({
      receipt_status: "void",
      voided_at: now,
      ...(newPdfBase64 ? { pdf_base64: newPdfBase64 } : {}),
    })
    .eq("id", receipt_id);

  if (updateError) {
    return NextResponse.json(
      { error: { code: "database_error", message: "Failed to update receipt status." } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: receipt.id,
    receipt_number: receipt.receipt_number,
    status: "void",
    voided_at: now,
  });
}
