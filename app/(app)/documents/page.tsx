import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateButton } from "@/components/documents/CreateButton";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { effectiveStatus, typeMeta, type DocType } from "@/lib/documents/status";
import { formatKobo } from "@/lib/money";

const filters = [
  { key: "all", label: "All" },
  { key: "receipt", label: "Receipts" },
  { key: "invoice", label: "Invoices" },
  { key: "quotation", label: "Quotations" },
] as const;

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const active = filters.some((f) => f.key === params.type) ? params.type! : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user!.id)
    .maybeSingle();

  let query = supabase
    .from("documents")
    .select("id, document_type, document_number, customer_name, total_kobo, balance_remaining_kobo, status, issued_date, due_date, valid_until")
    .eq("business_id", business!.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (active !== "all") query = query.eq("document_type", active as DocType);

  const { data: docs } = await query;
  const isStarter = profile?.plan === "starter" && profile?.subscription_status === "active";
  const { data: usage } = await supabase
    .from("business_usage_current")
    .select("documents_used")
    .eq("business_id", business!.id)
    .maybeSingle();
  const atLimit = !isStarter && (usage?.documents_used ?? 0) >= 5;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Documents</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">Everything you&apos;ve issued, newest first.</p>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3" role="note">
          Receipts prove payment · invoices request it · quotations price it — open a row to share
          the PDF or copy its verified link.
        </p>
      </div>

      <div className="-mx-5 overflow-x-auto px-5">
        <div role="tablist" aria-label="Filter documents" className="flex w-max gap-1.5">
          {filters.map((f) => {
            const isActive = active === f.key;
            return (
              <Link
                key={f.key}
                role="tab"
                aria-selected={isActive}
                href={f.key === "all" ? "/documents" : `/documents?type=${f.key}`}
                className={[
                  "inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13.5px] transition-colors",
                  isActive
                    ? "border-transparent bg-[var(--invert-bg)] font-medium text-[var(--invert-text)]"
                    : "border-line bg-surface text-ink-2 hover:text-ink",
                ].join(" ")}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {!docs || docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-12 text-center">
          <p className="text-[16px] font-medium text-ink">Nothing here yet</p>
          <p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] leading-relaxed text-ink-3">
            {active === "all"
              ? "Create your first document and it will appear here."
              : `You haven’t created any ${typeMeta[active as DocType].plural.toLowerCase()} yet.`}
          </p>
          <div className="mx-auto mt-5 max-w-[240px]">
            <CreateButton disabled={atLimit} />
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[14px] font-medium text-[var(--accent-text)]"
                >
                  {typeMeta[doc.document_type as DocType].label[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-ink">{doc.customer_name}</span>
                  <span className="num block text-[11.5px] text-ink-3">
                    {doc.document_number} · {new Date(doc.issued_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="num text-[14px] text-ink">{formatKobo(doc.total_kobo)}</span>
                  <StatusBadge status={effectiveStatus(doc)} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
