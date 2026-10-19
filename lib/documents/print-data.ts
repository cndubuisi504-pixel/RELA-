import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/documents/status";

export type PrintDoc = {
  id: string;
  document_type: DocType;
  document_number: string;
  customer_name: string;
  customer_phone: string | null;
  issued_date: string;
  status: string;
  quantity_label: string;
  currency: string;
  payment_instructions: string | null;
  subtotal_kobo: number;
  discount_kobo: number;
  tax_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  amount_paid_kobo: number;
  balance_remaining_kobo: number;
  due_date: string | null;
  valid_until: string | null;
  terms: string | null;
  payment_method: string | null;
  public_token: string;
  receipt_for_payment_kobo: number | null;
};

export type PrintItem = {
  item_name: string;
  description: string | null;
  quantity: string;
  unit_price_kobo: number;
  total_kobo: number;
};

export type PrintBusiness = {
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
};

export type PrintData = {
  doc: PrintDoc;
  items: PrintItem[];
  business: PrintBusiness;
  /** Watermark + footer pitch: free only. Starter exports are clean. */
  watermark: boolean;
};

/** Owner-only load; RLS scopes the document, so a missing row is a 404. */
export async function loadPrintData(id: string): Promise<PrintData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/documents/${id}/print`);

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, document_type, document_number, customer_name, customer_phone, issued_date, status, quantity_label, currency, payment_instructions, subtotal_kobo, discount_kobo, tax_kobo, delivery_kobo, total_kobo, amount_paid_kobo, balance_remaining_kobo, due_date, valid_until, terms, payment_method, public_token, receipt_for_payment_kobo",
    )
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const [{ data: items }, { data: business }, { data: profile }] = await Promise.all([
    supabase
      .from("document_items")
      .select("item_name, description, quantity, unit_price_kobo, total_kobo")
      .eq("document_id", id)
      .order("position"),
    supabase
      .from("businesses")
      .select(
        "name, address, phone, email, logo_url, bank_name, bank_account_name, bank_account_number",
      )
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("plan, subscription_status").eq("id", user.id).maybeSingle(),
  ]);

  if (!business) notFound();

  const watermark = !(
    profile?.plan === "starter" && profile?.subscription_status === "active"
  );

  return {
    doc: doc as PrintDoc,
    items: (items ?? []) as PrintItem[],
    business: business as PrintBusiness,
    watermark,
  };
}
