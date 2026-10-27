"use client";

import type { AdminOverviewMetrics } from "@/lib/admin/types";

export function AdminMetricsGrid({ metrics }: { metrics: AdminOverviewMetrics }) {
  const completionRate =
    metrics.totalBusinesses > 0
      ? Math.round((metrics.completedBusinesses / metrics.totalBusinesses) * 100)
      : 0;

  const userActivationRate =
    metrics.totalUsers > 0
      ? Math.round((metrics.totalBusinesses / metrics.totalUsers) * 100)
      : 0;

  const totalProcessedNaira =
    Math.round(metrics.totalDocumentVolumeKobo / 100) + metrics.totalApiVolume;

  const cards = [
    {
      title: "Registered Businesses",
      value: metrics.totalBusinesses.toString(),
      subtext: `${metrics.completedBusinesses} profile complete · ${metrics.incompleteBusinesses} exploring`,
      pill: `${completionRate}% complete`,
      pillType: completionRate >= 50 ? "success" : "neutral",
      icon: "🏢",
    },
    {
      title: "User Accounts",
      value: metrics.totalUsers.toString(),
      subtext: `${metrics.totalBusinesses} created a business profile`,
      pill: `${userActivationRate}% converted`,
      pillType: "neutral",
      icon: "👥",
    },
    {
      title: "Monthly Recurring Revenue",
      value: `₦${(metrics.mrrKobo / 100).toLocaleString()}`,
      subtext: `${metrics.activeSubscriptions} active Starter subscription${metrics.activeSubscriptions === 1 ? "" : "s"} (₦2,500/mo)`,
      pill: "Paystack live",
      pillType: metrics.activeSubscriptions > 0 ? "success" : "neutral",
      icon: "💳",
    },
    {
      title: "Documents Issued",
      value: (metrics.totalDocuments + metrics.totalApiReceipts).toString(),
      subtext: `${metrics.totalDocuments} in-app (${metrics.totalReceipts} receipts, ${metrics.totalInvoices} invoices) + ${metrics.totalApiReceipts} API`,
      pill: "All channels",
      pillType: "neutral",
      icon: "📄",
    },
    {
      title: "Total Volume Processed",
      value: `₦${totalProcessedNaira.toLocaleString()}`,
      subtext: `₦${Math.round(metrics.totalDocumentVolumeKobo / 100).toLocaleString()} manual + ₦${metrics.totalApiVolume.toLocaleString()} storefront API`,
      pill: "Gross volume",
      pillType: "success",
      icon: "⚡",
    },
    {
      title: "API Partners & Keys",
      value: metrics.activeApiKeys.toString(),
      subtext: `${metrics.totalApiReceipts} receipts issued via Storefront API`,
      pill: "ùwém & Orvla",
      pillType: "success",
      icon: "🔌",
    },
  ];

  return (
    <section aria-label="Key Platform Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {cards.map((c) => (
        <div
          key={c.title}
          className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs hover:border-[var(--primary)]/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {c.title}
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10.5px] font-medium tracking-tight",
                c.pillType === "success"
                  ? "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]"
                  : "bg-surface-2 text-ink-3 border border-line",
              ].join(" ")}
            >
              {c.pill}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="num text-[28px] font-semibold tracking-tight text-ink leading-none">
              {c.value}
            </span>
          </div>

          <p className="mt-2 text-[12px] text-ink-2 leading-relaxed">
            {c.subtext}
          </p>
        </div>
      ))}
    </section>
  );
}
