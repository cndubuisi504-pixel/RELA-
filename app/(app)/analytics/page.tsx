import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RevenueChart, type MonthPoint } from "@/components/analytics/RevenueChart";
import { formatKobo, asCurrency, CURRENCIES, type Currency } from "@/lib/money";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user!.id)
    .maybeSingle();

  const eligible = profile?.plan === "starter" && profile?.subscription_status === "active";

  if (!eligible) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Analytics</h1>
          <p className="mt-1 max-w-[50ch] text-[13.5px] leading-relaxed text-ink-3">
            Revenue collected, outstanding balances and your best customers — available on Starter.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="grid grid-cols-2 gap-3" aria-hidden>
            {["Revenue collected", "Outstanding", "Paid receipts", "Overdue invoices"].map((label) => (
              <div key={label} className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-ink-3">{label}</p>
                <div className="mt-2 h-5 w-20 rounded-md bg-line" />
              </div>
            ))}
          </div>
          <p className="mt-5 text-[14px] font-medium text-ink">Unlock analytics</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
            Analytics is part of Starter. Your documents are already being recorded, so the moment
            you upgrade the numbers are there.
          </p>
          <Link href="/upgrade" className="btn btn-primary btn-sm mt-4">
            See Starter
          </Link>
        </div>
      </div>
    );
  }

  // Starter: real numbers. One owner-scoped query; every figure is derived
  // from document rows the user is allowed to see anyway.
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .maybeSingle();

  const { data: docs } = business
    ? await supabase
        .from("documents")
        .select(
          "document_type, status, customer_name, total_kobo, amount_paid_kobo, balance_remaining_kobo, due_date, valid_until, issued_date, currency, receipt_for_payment_kobo",
        )
        .eq("business_id", business.id)
        .order("issued_date", { ascending: false })
        .limit(500)
    : { data: [] as never[] };

  const rows = docs ?? [];
  // One consistent view per currency — money never mixes across them.
  const present = CURRENCIES.filter((c) => rows.some((d) => asCurrency(d.currency as string | null) === c));
  const currencies: Currency[] = present.length ? present : ["NGN"];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Analytics</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">Six months of money in and out — from your own documents.</p>
      </div>

      {currencies.map((currency) => (
        <AnalyticsSection
          key={currency}
          currency={currency}
          rows={rows.filter((d) => asCurrency(d.currency as string | null) === currency)}
          badge={currencies.length > 1}
        />
      ))}
    </div>
  );
}

type AnalyticsRow = {
  document_type: string;
  status: string;
  receipt_for_payment_kobo: number | null;
  customer_name: string | null;
  amount_paid_kobo: number;
  balance_remaining_kobo: number;
  issued_date: string;
  due_date: string | null;
};

function AnalyticsSection({
  currency,
  rows,
  badge,
}: {
  currency: Currency;
  rows: AnalyticsRow[];
  badge: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);

  // --- month buckets, oldest → newest
  const now = new Date();
  const months: MonthPoint[] = [];
  const bucket = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    bucket.set(key, 0);
    months.push({
      label: d.toLocaleDateString("en-NG", { month: "short", timeZone: "UTC" }),
      full: d.toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }),
      value: 0,
    });
  }
  for (const doc of rows) {
    if (doc.document_type !== "receipt" || doc.status === "void" || doc.amount_paid_kobo <= 0) continue;
    const key = doc.issued_date.slice(0, 7);
    if (bucket.has(key)) bucket.set(key, bucket.get(key)! + (doc.receipt_for_payment_kobo ?? doc.amount_paid_kobo));
  }
  months.forEach((m, i) => {
    const key = [...bucket.keys()][i];
    m.value = bucket.get(key) ?? 0;
  });

  const thisMonthKey = now.toISOString().slice(0, 7);
  const collectedThisMonth = bucket.get(thisMonthKey) ?? 0;
  const outstanding = rows
    .filter((d) => d.document_type === "invoice" && d.status !== "void" && d.balance_remaining_kobo > 0)
    .reduce((sum, d) => sum + d.balance_remaining_kobo, 0);
  const overdueInvoices = rows.filter(
    (d) =>
      d.document_type === "invoice" &&
      d.status !== "void" &&
      d.balance_remaining_kobo > 0 &&
      d.due_date &&
      d.due_date < today,
  );
  const receiptsPaid = rows.filter((d) => d.document_type === "receipt" && d.status !== "void").length;

  // --- top customers by money collected
  const customers = new Map<string, { collected: number; docs: number }>();
  for (const d of rows) {
    if (!d.customer_name) continue;
    const entry = customers.get(d.customer_name) ?? { collected: 0, docs: 0 };
    if (d.document_type === "receipt" && d.status !== "void") {
      entry.collected += d.receipt_for_payment_kobo ?? d.amount_paid_kobo;
    }
    entry.docs += 1;
    customers.set(d.customer_name, entry);
  }
  const topCustomers = [...customers.entries()]
    .filter(([, value]) => value.collected > 0)
    .sort((a, b) => b[1].collected - a[1].collected)
    .slice(0, 5);

  const stats: [string, string, string?][] = [
    ["Collected this month", formatKobo(collectedThisMonth, currency)],
    ["Outstanding", formatKobo(outstanding, currency), overdueInvoices.length ? "text-[var(--warning)]" : undefined],
    ["Paid receipts", String(receiptsPaid)],
    ["Overdue invoices", String(overdueInvoices.length)],
  ];

  return (
    <div className="space-y-5" data-currency={currency}>
      {badge && <p className="eyebrow -mb-2">{currency} — figures in this section only</p>}

      <section aria-label={`Key numbers (${currency})`} className="grid grid-cols-2 gap-3">
        {stats.map(([label, value, valueClass]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-[11.5px] uppercase tracking-[0.1em] text-ink-3">{label}</p>
            <p className={`num mt-2 text-[21px] font-medium leading-none ${valueClass ?? "text-ink"}`}>
              {value}
            </p>
          </div>
        ))}
      </section>

      <section aria-label={`Money collected per month (${currency})`} className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Money collected</h2>
        <p className="mt-0.5 text-[12px] text-ink-3">Receipts recorded, last six months</p>
        <div className="mt-3">
          <RevenueChart data={months} currency={currency} />
        </div>
      </section>

      {overdueInvoices.length > 0 && (
        <section aria-label={`Overdue invoices (${currency})`} className="rounded-2xl border border-[var(--warning)]/35 bg-[var(--warning-bg)] p-4">
          <h2 className="text-[14px] font-medium text-[var(--warning)]">
            {overdueInvoices.length} overdue invoice{overdueInvoices.length === 1 ? "" : "s"} worth{" "}
            {formatKobo(overdueInvoices.reduce((s, d) => s + d.balance_remaining_kobo, 0), currency)}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            Chase these first — open the invoice and re-share the verification link with a polite
            reminder.
          </p>
        </section>
      )}

      <section aria-label={`Top customers (${currency})`} className="rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-4 py-3 text-[14px] font-medium text-ink">
          Top customers
        </h2>
        {topCustomers.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-ink-3">
            Record a few receipts and your best customers surface here.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {topCustomers.map(([name, c], i) => (
              <li key={name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="num w-5 text-center text-[12px] text-ink-3">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{name}</p>
                    <p className="text-[11.5px] text-ink-3">
                      {c.docs} document{c.docs === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="num shrink-0 text-[13.5px] text-ink">{formatKobo(c.collected, currency)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
