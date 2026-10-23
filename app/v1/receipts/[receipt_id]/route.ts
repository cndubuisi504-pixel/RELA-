import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getServiceSupabase } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function GET(
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
      { error: { code: "missing_parameter", message: "receipt_id is required." } },
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
      { error: { code: "not_found", message: `Receipt '${receipt_id}' not found.` } },
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
    voided_at: receipt.voided_at || null,
  });
}
