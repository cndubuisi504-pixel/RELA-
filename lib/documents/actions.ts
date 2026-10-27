"use server";

import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/documents/status";
import { CURRENCIES, type Currency } from "@/lib/money";
import { checkBusinessProfileCompletion } from "@/lib/business/guard";

export type NewDocumentInput = {
  type: DocType;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  mode: "product" | "service";
  showQuantity: boolean;
  quantityLabel: "qty" | "hours" | "days" | "projects" | "sessions";
  currency: string;
  paymentInstructions: string;
  items: { name: string; description: string; quantity: string; unitPrice: string }[];
  discount: string;
  tax: string;
  delivery: string;
  amountPaid: string;
  paymentMethod: string;
  dueDate: string;
  validUntil: string;
  terms: string;
  notes: string;
};

export type NewDocumentResult =
  | { ok: true; id: string; number: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function nairaToKobo(value: string): number {
  const cleaned = value.replace(/[₦$£€,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return -1;
  return Math.round(n * 100);
}

export async function createDocument(input: NewDocumentInput): Promise<NewDocumentResult> {
  const fieldErrors: Record<string, string> = {};

  if (!input.customerName.trim()) {
    fieldErrors.customerName = "Add the customer’s name — every document needs one.";
  }

  const rows = input.items
    .map((item) => ({
      name: item.name.trim(),
      description: item.description.trim(),
      quantity: item.quantity.trim() || "1",
      unitPrice: item.unitPrice.replace(/[₦$£€,\s]/g, ""),
    }))
    .filter((item) => item.name.length > 0 || Number(item.unitPrice) > 0);

  if (rows.length === 0) {
    fieldErrors.items = "Add at least one item with a name and an amount.";
  }
  if (rows.some((r) => !r.name)) {
    fieldErrors.items = "Every row needs a name.";
  }
  if (rows.some((r) => Number(r.unitPrice) <= 0 || Number.isNaN(Number(r.unitPrice)))) {
    fieldErrors.items = "Every row needs an amount above zero.";
  }
  if (rows.some((r) => input.mode === "service" && input.showQuantity && !(Number(r.quantity) > 0))) {
    fieldErrors.items = "Quantities must be greater than zero.";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, error: "Check the highlighted fields.", fieldErrors };

  const currency = input.currency ?? "NGN";
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    return { ok: false, error: "Choose NGN, USD, GBP or EUR for this document." };
  }
  const paymentInstructions =
    input.type === "invoice" || input.type === "quotation"
      ? (input.paymentInstructions ?? "").trim().slice(0, 500) || null
      : null;

  const discountKobo = nairaToKobo(input.discount);
  const taxKobo = nairaToKobo(input.tax);
  const deliveryKobo = input.mode === "product" ? nairaToKobo(input.delivery) : 0;
  const paidKobo = nairaToKobo(input.amountPaid);

  // Receipts prove money received: a directly-created receipt must be paid in full.
  // Partial or zero payment is an invoice's job; each payment there mints its own receipt.
  if (input.type === "receipt") {
    const subtotal = rows.reduce((sum, r) => {
      const qty = Number(r.quantity) || 1;
      return sum + Math.round(qty * Number(r.unitPrice) * 100);
    }, 0);
    const computedTotal = Math.max(0, subtotal - discountKobo + taxKobo + deliveryKobo);
    if (computedTotal <= 0 || paidKobo !== computedTotal) {
      return {
        ok: false,
        error:
          "A receipt is proof of payment — it needs the full total. If the customer hasn’t paid everything yet, create an invoice instead; each payment you record turns into its own receipt.",
      };
    }
  }
  if (discountKobo < 0 || taxKobo < 0 || deliveryKobo < 0 || paidKobo < 0) {
    return { ok: false, error: "Amounts can’t be negative." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to create a document." };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("phone, address, bank_account_number, bank_name")
    .eq("owner_id", user.id)
    .maybeSingle();

  const profileCheck = checkBusinessProfileCompletion(business);
  if (!profileCheck.isComplete) {
    return {
      ok: false,
      error: `Please complete your business profile (${profileCheck.missingFields.join(", ")}) in Settings before creating documents.`,
    };
  }

  const { data, error } = await supabase.rpc("create_document_in_currency", {
    p_type: input.type,
    p_currency: currency as Currency,
    p_payment_instructions: paymentInstructions,
    p_customer_name: input.customerName.trim(),
    p_customer_phone: input.customerPhone.trim() || null,
    p_customer_email: input.customerEmail.trim().toLowerCase() || null,
    p_mode: input.mode,
    p_show_quantity: input.mode === "service" ? input.showQuantity : true,
    p_quantity_label: input.quantityLabel,
    p_items: rows.map((r) => ({
      name: r.name,
      description: r.description,
      quantity: r.quantity,
      unit_price_kobo: Math.round(Number(r.unitPrice) * 100),
      rate_kobo: Math.round(Number(r.unitPrice) * 100),
    })),
    p_discount_kobo: discountKobo,
    p_tax_kobo: taxKobo,
    p_delivery_kobo: deliveryKobo,
    p_amount_paid_kobo: paidKobo,
    p_payment_method: input.paymentMethod.trim() || null,
    p_due_date: input.type === "invoice" && input.dueDate ? input.dueDate : null,
    p_valid_until: input.type === "quotation" && input.validUntil ? input.validUntil : null,
    p_terms: input.terms.trim() || null,
    p_payment_terms: null,
    p_notes: null,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("free_document_limit_reached")) {
      return {
        ok: false,
        error: "You’ve used all 5 free documents this month. Upgrade to Starter for unlimited documents.",
      };
    }
    if (message.includes("direct_receipt_fully_paid") || message.includes("receipt_requires_full_payment")) {
      return {
        ok: false,
        error:
          "A receipt is proof of payment — it needs the full total. Use an invoice for partial payments.",
      };
    }
    if (message.includes("paid_exceeds_total")) {
      return { ok: false, error: "The amount paid can’t be more than the total.", fieldErrors: { amountPaid: "That’s more than the total." } };
    }
    if (message.includes("no_business_for_user")) {
      return { ok: false, error: "Finish your business setup before creating documents." };
    }
    console.error("create_document", message);
    return { ok: false, error: "We couldn’t save this document. Your entries are safe — try again." };
  }

  const result = data as { id: string; number: string };

  return { ok: true, id: result.id, number: result.number };
}
