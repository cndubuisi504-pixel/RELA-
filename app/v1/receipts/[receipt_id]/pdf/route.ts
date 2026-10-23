import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getServiceSupabase } from "@/lib/api/auth";
import { generateReceiptPdf } from "@/lib/api/receipt-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receipt_id: string }> }
) {
  const { receipt_id } = await params;

  if (!receipt_id) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Receipt ID is required." } },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  // 1. Fetch receipt
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

  // 2. Authorize via query token or Bearer key
  const tokenQuery = req.nextUrl.searchParams.get("token");
  let isAuthorized = false;

  if (tokenQuery && tokenQuery.trim() === receipt.download_token) {
    isAuthorized = true;
  } else {
    const auth = await validateApiKey(req);
    if (auth.authenticated) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Unauthorized access. Provide a valid Bearer token or permanent download token.",
        },
      },
      { status: 401 }
    );
  }

  // 3. Obtain PDF bytes
  let pdfBuffer: Buffer;
  if (receipt.pdf_base64) {
    pdfBuffer = Buffer.from(receipt.pdf_base64, "base64");
  } else {
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
        paymentStatus: receipt.payment_status || "paid",
        purchaseDate: receipt.purchase_date || receipt.created_at,
        verificationUrl: receipt.verification_url,
        isTest: receipt.is_test,
        isVoid: receipt.receipt_status === "void",
        isKobo,
      });
      pdfBuffer = Buffer.from(pdfBytes);
      supabase
        .from("api_receipts")
        .update({ pdf_base64: pdfBuffer.toString("base64") })
        .eq("id", receipt.id)
        .then(() => {}, () => {});
    } catch {
      return NextResponse.json(
        { error: { code: "pdf_generation_failed", message: "Failed to generate receipt PDF." } },
        { status: 500 }
      );
    }
  }

  const filename = `receipt-${receipt.receipt_number}.pdf`;
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(uint8.byteLength),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
