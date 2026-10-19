"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseNairaToKobo } from "@/lib/money";

export type ConversionState = { error: string } | null;

export type PaymentState =
  | { error: string; amount?: string }
  | null;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Database errors arrive as `code:detail`. Turn them into copy a vendor can act on. */
function explain(message: string): string {
  if (message.includes("only_quotations_convert_to_invoices"))
    return "Only quotations can be turned into an invoice.";
  if (message.includes("only_invoices_convert_to_receipts"))
    return "Only invoices can take a payment.";
  if (message.includes("invoice_already_paid"))
    return "This invoice is already fully paid.";
  if (message.includes("amount_exceeds_balance"))
    return "That’s more than the outstanding balance.";
  if (message.includes("amount_must_be_positive"))
    return "Enter an amount above zero.";
  if (message.includes("free_document_limit_reached"))
    return "You’ve used all 5 free documents this month. Upgrade to Starter to keep going.";
  if (message.includes("no_business_for_user"))
    return "Finish your business setup first.";
  if (message.includes("document_not_found"))
    return "We couldn’t find that document. It may have been deleted.";
  return "That didn’t go through. Nothing was changed — try again.";
}

function idFrom(message: string, marker: string): string | null {
  if (!message.includes(marker)) return null;
  const match = message.match(UUID);
  return match ? match[0] : null;
}

/**
 * Quotation → invoice. The server copies the customer, line items and totals and
 * allocates a fresh INV- number, so the two documents never drift apart.
 */
export async function convertToInvoice(documentId: string): Promise<ConversionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_document", {
    p_source_id: documentId,
    p_target: "invoice",
    p_amount_paid_kobo: 0,
    p_payment_method: null,
  });

  if (error) {
    const message = error.message ?? "";
    // A second tap is not an error: send the vendor to the invoice that already exists.
    const existing = idFrom(message, "already_converted");
    if (existing) redirect(`/documents/${existing}`);
    console.error("convert_document", message);
    return { error: explain(message) };
  }

  const created = data as { id: string };
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath(`/documents/${documentId}`);
  redirect(`/documents/${created.id}?converted=1`);
}

/**
 * Invoice → receipt. Records any amount against the outstanding balance
 * (the full balance when no amount is given) and returns the receipt.
 */
export async function recordPayment(
  _prev: PaymentState,
  formData: FormData,
): Promise<PaymentState> {
  const documentId = String(formData.get("documentId") ?? "");
  const rawAmount = String(formData.get("amount") ?? "").trim();
  const method = String(formData.get("method") ?? "").trim();
  const balanceKobo = Number(formData.get("balanceKobo") ?? 0);

  let amountKobo = Math.max(0, Math.round(balanceKobo));

  if (rawAmount) {
    const parsed = parseNairaToKobo(rawAmount);
    if (parsed === null) {
      return { error: "Enter a plain number, like 25000 or 25,000.50.", amount: rawAmount };
    }
    if (parsed === 0) {
      return { error: "Enter an amount above zero.", amount: rawAmount };
    }
    amountKobo = parsed;
  }

  if (amountKobo <= 0) {
    return { error: "There’s nothing left to pay on this invoice.", amount: rawAmount };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_document", {
    p_source_id: documentId,
    p_target: "receipt",
    p_amount_paid_kobo: amountKobo,
    p_payment_method: method || null,
  });

  if (error) {
    const message = error.message ?? "";
    // Double-submit or a repeat tap: the payment is already recorded, show that receipt.
    const existing = idFrom(message, "duplicate_payment");
    if (existing) redirect(`/documents/${existing}?payment=1`);
    console.error("record_payment", message);
    return { error: explain(message), amount: rawAmount };
  }

  const receipt = data as { id: string };
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath(`/documents/${documentId}`);
  redirect(`/documents/${receipt.id}?payment=1`);
}

const QUOTATION_STATUSES = ["sent", "accepted", "declined", "expired"] as const;

/** Status moves that are not a payment: quotations and invoice "sent". */
export async function updateDocumentStatus(
  _prev: ConversionState,
  formData: FormData,
): Promise<ConversionState> {
  const documentId = String(formData.get("documentId") ?? "");
  const status = String(formData.get("status") ?? "");

  // The database validates transitions too; this just fails fast with better copy.
  if (!QUOTATION_STATUSES.includes(status as (typeof QUOTATION_STATUSES)[number]) && status !== "sent") {
    return { error: "That status change isn’t allowed." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_document_status", {
    p_id: documentId,
    p_status: status,
  });

  if (error) {
    console.error("set_document_status", error.message);
    return { error: explain(error.message ?? "") };
  }

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath(`/documents/${documentId}`);
  return null;
}
