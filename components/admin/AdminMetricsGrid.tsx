"use client";

import type { AdminOverviewMetrics } from "@/lib/admin/types";

export function AdminMetricsGrid({ metrics }: { metrics: AdminOverviewMetrics }) {
  const completionRate = metrics.profileCompletionRate ?? (
    metrics.totalBusinesses > 0
      ? Math.round((metrics.completedBusinesses / metrics.totalBusinesses) * 100)
      : 0
  );

  const businessCreationRate = metrics.businessCreationRate ?? (
    metrics.totalUsers > 0
      ? Math.round((metrics.totalBusinesses / metrics.totalUsers) * 100)
      : 0
  );

  const firstDocRate = metrics.firstDocumentCreationRate ?? 0;
  const timeToDoc = metrics.medianTimeToFirstDocMinutes !== undefined
    ? `${metrics.medianTimeToFirstDocMinutes}m`
    : "—";

  const totalProcessedNaira =
    Math.round(metrics.totalDocumentVolumeKobo / 100) + metrics.totalApiVolume;

  const funnelCards = [
    {
      label: "1. Reg. Completion",
      val: `${metrics.registrationCompletionRate ?? 100}%`,
      sub: `${metrics.totalUsers} registered users`,
      highlight: false,
    },
    {
      label: "2. Business Creation",
      val: `${businessCreationRate}%`,
      sub: `${metrics.totalBusinesses} businesses`,
      highlight: false,
    },
    {
      label: "3. First Document (Primary)",
      val: `${firstDocRate}%`,
      sub: `${metrics.usersWithFirstDocument ?? 0} created ≥1 doc`,
      highlight: true,
    },
    {
      label: "4. Time to 1st Doc",
      val: timeToDoc,
      sub: `Avg: ${metrics.avgTimeToFirstDocMinutes ?? 0}m`,
      highlight: false,
    },
    {
      label: "5. Profile Completed",
      val: `${completionRate}%`,
      sub: `${metrics.completedBusinesses} with all 5 steps`,
      highlight: false,
    },
  ];

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
      pill: `${businessCreationRate}% converted`,
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
    <div className="space-y-4">
      {/* Activation & Funnel Performance Banner */}
      <section
        aria-label="Onboarding & Activation Funnel"
        className="rounded-2xl border border-[var(--primary-soft)] bg-surface p-4 sm:p-5 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-xs">
              🎯
            </span>
            <h2 className="text-[13.5px] font-semibold text-ink sm:text-[14px]">
              Friction Reduction &amp; Activation Funnel
            </h2>
          </div>
          <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
            Primary Goal: First Document Creation
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {funnelCards.map((f) => (
            <div
              key={f.label}
              className={[
                "rounded-xl border p-3 transition-colors",
                f.highlight
                  ? "border-[var(--primary)] bg-[var(--primary-soft)]/20 shadow-xs"
                  : "border-line bg-surface-2/40",
              ].join(" ")}
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3 truncate">
                {f.label}
              </p>
              <p
                className={[
                  "num mt-1 text-[22px] font-semibold tracking-tight",
                  f.highlight ? "text-[var(--primary)]" : "text-ink",
                ].join(" ")}
              >
                {f.val}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3 truncate">{f.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* High-level Platform KPIs */}
      <section
        aria-label="Key Platform Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
      >
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
    </div>
  );
}
