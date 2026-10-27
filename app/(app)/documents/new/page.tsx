import Link from "next/link";
import { asCurrency } from "@/lib/money";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { checkBusinessProfileCompletion } from "@/lib/business/guard";
import type { DocType } from "@/lib/documents/status";

export const metadata = { title: "New document" };

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
      .select("id, default_mode, setup_completed_at, default_currency, payment_instructions, phone, address, bank_account_number, bank_name")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("plan, subscription_status").eq("id", user.id).maybeSingle(),
  ]);

  if (!business?.setup_completed_at) redirect("/setup");

  // Guard: if user skipped onboarding to explore, require real contact & payment details
  // before allowing creation of customer-facing receipts, invoices, or quotations.
  const profileCheck = checkBusinessProfileCompletion(business);
  if (!profileCheck.isComplete) {
    const docLabel = type === "receipt" ? "receipts" : type === "invoice" ? "invoices" : "quotations";
    return (
      <div className="mx-auto max-w-[560px] pt-4 pb-12">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 text-center space-y-5 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-2xl">
            📋
          </div>
          <div>
            <h1 className="text-[20px] font-medium tracking-tight text-ink">
              Complete your business profile first
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              Before creating and issuing {docLabel} to customers, please finish adding your real business contact and payment details so they appear properly on your documents.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-left">
            <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-3 mb-2.5">
              Still needed on your profile:
            </p>
            <ul className="space-y-2 text-[13px] text-ink">
              {profileCheck.missingFields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[11px] font-bold text-[var(--primary)]">
                    !
                  </span>
                  <span>{field}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link href="/settings" className="btn btn-primary">
              Complete details in Settings →
            </Link>
            <Link href="/dashboard" className="btn btn-ghost">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: usage } = await supabase
    .from("business_usage_current")
    .select("documents_used")
    .eq("business_id", business.id)
    .maybeSingle();

  const isStarter = profile?.plan === "starter" && profile?.subscription_status === "active";
  if (!isStarter && (usage?.documents_used ?? 0) >= 5) {
    redirect("/upgrade?limit=1");
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-[12px] leading-relaxed text-ink-3" role="note">
        Products can add a delivery fee in Totals · “Add service” adds more rows in Services mode.
      </p>
      <DocumentEditor
        type={type}
        defaultMode={business.default_mode === "service" ? "service" : "product"}
        defaultCurrency={asCurrency(business.default_currency)}
        defaultPaymentInstructions={business.payment_instructions ?? ""}
        quantityLabelDefault="qty"
      />
    </div>
  );
}
