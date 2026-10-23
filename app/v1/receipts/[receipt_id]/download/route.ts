import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, getServiceSupabase } from "@/lib/api/auth";
import { generateReceiptPdf } from "@/lib/api/receipt-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receipt_id: string }> }
) {
  const { receipt_id } = await params;

  if (!receipt_id || typeof receipt_id !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "invalid_request",
        message: "Receipt ID is required.",
      },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  // 1. Fetch receipt from database
  const { data: receipt, error } = await supabase
    .from("api_receipts")
    .select("*")
    .eq("id", receipt_id)
    .single();

  if (error || !receipt) {
    return NextResponse.json(
      {
        success: false,
        error: "not_found",
        message: `Receipt ${receipt_id} not found.`,
      },
      { status: 404 }
    );
  }

  // 2. Authorize access
  // Can be authorized either by:
  // A. Valid signed download token in query param: ?token=<download_token>
  // B. Valid API key in Authorization: Bearer <API_KEY> header
  const tokenQuery = req.nextUrl.searchParams.get("token");
  let isAuthorized = false;

  if (tokenQuery && tokenQuery.trim() === receipt.download_token) {
    isAuthorized = true;
  } else {
    const auth = await validateApiKey(req);
    if (auth.authenticated) {
      // If API key is tied to a specific business, ensure it matches
      if (auth.businessId && receipt.business_id && auth.businessId !== receipt.business_id) {
        return NextResponse.json(
          {
            success: false,
            error: "forbidden",
            message: "You do not have permission to access this receipt.",
          },
          { status: 403 }
        );
      }
      isAuthorized = true;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "unauthorized",
          message: auth.message || "Unauthorized access. Provide a valid Bearer token or signed download token.",
        },
        { status: 401 }
      );
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: "unauthorized",
        message: "Unauthorized access. Provide a valid Bearer token or signed download token.",
      },
      { status: 401 }
    );
  }

  // 3. Obtain PDF buffer
  let pdfBuffer: Buffer;

  if (receipt.pdf_base64) {
    pdfBuffer = Buffer.from(receipt.pdf_base64, "base64");
  } else {
    // Regenerate on demand if not cached
    try {
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
      });
      pdfBuffer = Buffer.from(pdfBytes);

      // Cache back to database
      supabase
        .from("api_receipts")
        .update({ pdf_base64: pdfBuffer.toString("base64") })
        .eq("id", receipt.id)
        .then(() => {}, () => {});
    } catch (genErr) {
      console.error("PDF on-demand generation failure:", genErr);
      return NextResponse.json(
        {
          success: false,
          error: "pdf_generation_failed",
          message: "Failed to generate receipt PDF.",
        },
        { status: 500 }
      );
    }
  }

  // 4. Return PDF response with required headers
  const filename = `receipt-${receipt.receipt_number}.pdf`;
  const uint8 = new Uint8Array(pdfBuffer);

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(uint8.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
