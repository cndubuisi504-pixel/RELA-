import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "@/components/documents/DocumentEditor";
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

  const [{ data: business }, { data: profile }, { data: usage }] = await Promise.all([
    supabase
      .from("businesses")
      .select("default_mode, setup_completed_at")
      .eq("owner_id", user!.id)
      .maybeSingle(),
    supabase.from("profiles").select("plan, subscription_status").eq("id", user!.id).maybeSingle(),
    supabase.from("business_usage_current").select("documents_used").eq("business_id", (await supabase.from("businesses").select("id").eq("owner_id", user!.id).maybeSingle()).data?.id ?? "").maybeSingle(),
  ]);

  if (!business?.setup_completed_at) redirect("/setup");

  const isStarter = profile?.plan === "starter" && profile?.subscription_status === "active";
  if (!isStarter && (usage?.documents_used ?? 0) >= 5) {
    redirect("/upgrade?limit=1");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Filling this in, quickly</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          Enter the customer and the items, and we’ll number and format everything. Products can add
          a <strong className="font-medium text-ink-2">delivery fee</strong> in Totals; in Services
          mode use <strong className="font-medium text-ink-2">“Add service”</strong> for as many rows
          as the job needs. Discounts and VAT adjust the total at the bottom.
        </p>
      </div>
      <DocumentEditor
        type={type}
        defaultMode={business.default_mode === "service" ? "service" : "product"}
        quantityLabelDefault="qty"
      />
    </div>
  );
}
