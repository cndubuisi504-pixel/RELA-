import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateButton } from "@/components/documents/CreateButton";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { typeMeta, type DocType } from "@/lib/documents/status";
import { formatKobo, asCurrency, CURRENCIES, type Currency } from "@/lib/money";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";

const filters = [
  { key: "all", label: "All" },
  { key: "receipt", label: "Receipts" },
  { key: "invoice", label: "Invoices" },
  { key: "quotation", label: "Quotations" },
] as const;

type Row = {
  id: string;
  document_type: DocType;
  document_number: string;
  customer_name: string;
  total_kobo: number;
  amount_paid_kobo: number;
  receipt_for_payment_kobo: number | null;
  balance_remaining_kobo: number;
  status: string;
  issued_date: string;
  currency: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = filters.some((f) => f.key === params.type) ? params.type! : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, default_currency")
    .eq("owner_id", user!.id)
    .maybeSingle();

  const [{ data: profile }, { data: usage }, { data: docs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, subscription_status, subscription_ends_at, full_name")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("business_usage_current")
      .select("documents_used")
      .eq("business_id", business!.id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, document_type, document_number, customer_name, total_kobo, amount_paid_kobo, balance_remaining_kobo, status, issued_date, currency, receipt_for_payment_kobo")
      .eq("business_id", business!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const isStarter =
    profile?.plan === "starter" && profile?.subscription_status === "active";
  const used = usage?.documents_used ?? 0;
  const limit = 5;
  const atLimit = !isStarter && used >= limit;

  const all = (docs ?? []) as Row[];
  const visible = activeFilter === "all" ? all : all.filter((d) => d.document_type === activeFilter);

  // Keep each currency separate; payment receipts count only this payment, not the running total.
  const outstandingBy: Partial<Record<Currency, number>> = {};
  for (const d of all.filter((d) => d.document_type === "invoice" && d.status !== "void" && d.balance_remaining_kobo > 0)) {
    const c = asCurrency(d.currency as string | null);
    outstandingBy[c] = (outstandingBy[c] ?? 0) + d.balance_remaining_kobo;
  }
  const collectedBy: Partial<Record<Currency, number>> = {};
  for (const d of all.filter((d) => d.document_type === "receipt" && d.status !== "void")) {
    const c = asCurrency(d.currency as string | null);
    collectedBy[c] = (collectedBy[c] ?? 0) + (d.receipt_for_payment_kobo ?? d.amount_paid_kobo);
  }
  const activeCurrencies = CURRENCIES.filter((c) => all.some((d) => asCurrency(d.currency) === c));
  const zeroCurrencies: Currency[] = activeCurrencies.length
    ? activeCurrencies
    : [asCurrency(business?.default_currency)];
  const fmtStack = (by: Partial<Record<Currency, number>>) => {
    const nonzero = CURRENCIES.filter((c) => (by[c] ?? 0) > 0);
    return (nonzero.length ? nonzero : zeroCurrencies).map((c) => formatKobo(by[c] ?? 0, c));
  };

  const monthLabel = new Date().toLocaleDateString("en-NG", { month: "long" });
  const daysLeft = profile?.subscription_ends_at
    ? Math.max(
        0,
        Math.ceil((new Date(profile.subscription_ends_at).getTime() - Date.now()) / 86_400_000),
      )
    : null;

  return (
    <div className="space-y-5">
      {/* Plan / usage banner */}
      {isStarter ? (
        <section className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[14px] font-medium text-[var(--success)]">
              <CheckIcon size={15} strokeWidth={3} />
              Starter active — unlimited documents
            </p>
            <p className="text-[12.5px] text-[var(--success)]">
              {daysLeft !== null ? `Renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` : "No renewal date set"}
            </p>
          </div>
        </section>
      ) : (
        <section
          className={[
            "rounded-2xl border p-4",
            atLimit
              ? "border-[var(--warning)]/35 bg-[var(--warning-bg)]"
              : "border-line bg-surface",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[14px] font-medium text-ink">
              <span className="num">{used}</span> of <span className="num">{limit}</span> documents used
              in {monthLabel}
            </p>
            <Link
              href="/upgrade"
              className="inline-flex min-h-11 items-center text-[13.5px] font-medium text-[var(--accent-text)] hover:underline"
            >
              Upgrade to Starter
            </Link>
          </div>
          <div
            className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-valuenow={used}
            aria-label={`${used} of ${limit} free documents used this month`}
          >
            <div
              className={`h-full rounded-full ${atLimit ? "bg-[var(--warning)]" : "bg-primary"}`}
              style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">
            {atLimit
              ? "You’ve reached this month’s limit. Existing documents are still available."
              : `Resets on the 1st. ${limit - used} left this month.`}
          </p>
        </section>
      )}

      {/* Title + create */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">
            {business?.name}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-3">
            {all.length === 0 ? "Your documents will live here." : `${all.length} document${all.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <CreateButton disabled={atLimit} full label="Create document" />

      {/* Summary */}
      <section aria-label="Summary" className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[12px] uppercase tracking-[0.12em] text-ink-3">Outstanding</p>
          <div className="mt-1.5 space-y-0.5">
            {fmtStack(outstandingBy).map((line) => (
              <p key={line} className="num text-[22px] font-medium leading-none text-ink">
                {line}
              </p>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-3">Unpaid invoice balances</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[12px] uppercase tracking-[0.12em] text-ink-3">Collected</p>
          <div className="mt-1.5 space-y-0.5">
            {fmtStack(collectedBy).map((line) => (
              <p key={line} className="num text-[22px] font-medium leading-none text-ink">
                {line}
              </p>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-3">Across receipts issued</p>
        </div>
      </section>

      <p className="text-center text-[12px] leading-relaxed text-ink-3" role="note">
        Collected = money received (receipts) · Outstanding = money still owed to you (invoices).
      </p>

      {/* Filters */}
      <div className="-mx-5 overflow-x-auto px-5">
        <div role="tablist" aria-label="Filter documents" className="flex w-max gap-1.5">
          {filters.map((f) => {
            const active = activeFilter === f.key;
            return (
              <Link
                key={f.key}
                role="tab"
                aria-selected={active}
                href={f.key === "all" ? "/dashboard" : `/dashboard?type=${f.key}`}
                className={[
                  "inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13.5px] transition-colors",
                  active
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

      {/* Documents */}
      {visible.length === 0 ? (
        <EmptyState hasAny={all.length > 0} filterLabel={filters.find((f) => f.key === activeFilter)?.label ?? "All"} atLimit={atLimit} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {visible.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[14px] font-medium text-[var(--accent-text)]"
                >
                  {typeMeta[doc.document_type].label[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-ink">
                    {doc.customer_name}
                  </span>
                  <span className="num block text-[11.5px] text-ink-3">{doc.document_number}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="num text-[14px] text-ink">{formatKobo(doc.total_kobo, asCurrency(doc.currency as string | null))}</span>
                  <StatusBadge status={doc.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {all.length > 0 && (
        <div className="text-center">
          <Link
            href="/documents"
            className="inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-medium text-[var(--accent-text)] hover:underline"
          >
            See all documents
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  hasAny,
  filterLabel,
  atLimit,
}: {
  hasAny: boolean;
  filterLabel: string;
  atLimit: boolean;
}) {
  if (hasAny) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
        <p className="text-[15px] font-medium text-ink">No {filterLabel.toLowerCase()} yet</p>
        <p className="mx-auto mt-1.5 max-w-[36ch] text-[13px] leading-relaxed text-ink-3">
          Documents you create of this type will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)]">
        <span className="text-[19px] font-medium text-[var(--accent-text)]">R</span>
      </div>
      <p className="mt-3 text-[16px] font-medium text-ink">No documents yet</p>
      <p className="mx-auto mt-1.5 max-w-[38ch] text-[13px] leading-relaxed text-ink-3">
        Start with a receipt for money you&apos;ve received, an invoice you need paid, or a
        quotation for a job you&apos;re pricing.
      </p>
      {atLimit ? (
        <Link href="/upgrade" className="btn btn-ghost btn-sm mt-4">
          See upgrade options
        </Link>
      ) : (
        <p className="mt-4 text-[12.5px] text-ink-3">Tap “Create document” to begin.</p>
      )}
    </div>
  );
}
