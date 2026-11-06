import { asCurrency } from "@/lib/money";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import type { DocType } from "@/lib/documents/status";

export const metadata = { title: "New document · rela." };

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type: DocType =
    params.type === "invoice" || params.type === "quotation" ? params.type : "receipt";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id, name, default_mode, setup_completed_at, default_currency, payment_instructions, phone, address, bank_account_number, bank_name, logo_url",
      )
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("plan, subscription_status").eq("id", user.id).maybeSingle(),
  ]);

  if (!business || !business.name) redirect("/setup/business");

  const { data: usage } = await supabase
    .from("business_usage_current")
    .select("documents_used")
    .eq("business_id", business.id)
    .maybeSingle();

  const isStarter = profile?.plan === "starter" && profile?.subscription_status === "active";
  if (!isStarter && (usage?.documents_used ?? 0) >= 5) {
    redirect("/upgrade?limit=1");
  }

  const hasBank = Boolean(
    business.bank_account_number && business.bank_account_number.trim().length >= 8,
  );
  const hasLogo = Boolean(business.logo_url && business.logo_url.trim().length > 0);
  const hasAddress = Boolean(
    business.address &&
      business.address.trim().length >= 5 &&
      business.address.trim().toLowerCase() !== "nigeria",
  );

  return (
    <div className="space-y-3">
      <p className="text-center text-[12px] leading-relaxed text-ink-3" role="note">
        Products can add a delivery fee in Totals · “Add service” adds more rows in Services mode.
      </p>
      <DocumentEditor
        type={type}
        defaultMode={business.default_mode === "service" ? "service" : "product"}
        defaultCurrency={asCurrency(business.default_currency)}
        defaultPaymentInstructions={business.payment_instructions ?? ""}
        quantityLabelDefault="qty"
        hasBank={hasBank}
        hasLogo={hasLogo}
        hasAddress={hasAddress}
      />
    </div>
  );
}
