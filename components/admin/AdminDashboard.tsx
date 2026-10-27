"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminMetricsGrid } from "./AdminMetricsGrid";
import { AdminCharts } from "./AdminCharts";
import { BusinessesTable } from "./BusinessesTable";
import { SubscriptionsTable } from "./SubscriptionsTable";
import { ApiReceiptsTable } from "./ApiReceiptsTable";
import { LogoManager } from "./LogoManager";
import type { AdminFullData } from "@/lib/admin/types";

type AdminTab = "overview" | "businesses" | "subscriptions" | "api" | "branding";

export function AdminDashboard({
  data,
  adminEmail,
  logoUrl,
}: {
  data: AdminFullData;
  adminEmail: string;
  logoUrl: string | null;
}) {
  const [tab, setTab] = useState<AdminTab>("overview");

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview & Analytics" },
    { key: "businesses", label: "Businesses", count: data.businesses.length },
    { key: "subscriptions", label: "Payments & Plans", count: data.subscriptions.length },
    { key: "api", label: "Storefront API", count: data.apiReceipts.length },
    { key: "branding", label: "Site Branding" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">
              Admin Command Center
            </h1>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              Live Production
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            Signed in as <span className="font-mono text-ink-2">{adminEmail}</span> · Platform analytics &amp; management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="btn btn-ghost btn-sm text-[12.5px] border border-line bg-surface"
          >
            ← Open App Dashboard
          </Link>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-line gap-2 pb-px scrollbar-none">
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-all",
                isActive
                  ? "border-[var(--primary)] text-ink font-semibold"
                  : "border-transparent text-ink-3 hover:text-ink hover:border-line",
              ].join(" ")}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[11px] font-mono",
                    isActive
                      ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold"
                      : "bg-surface-2 text-ink-3",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AdminMetricsGrid metrics={data.metrics} />
          <AdminCharts timeline={data.timeline} metrics={data.metrics} />

          {/* Quick Peek: Recent Activity Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            {/* Recent Businesses */}
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="text-[15px] font-medium text-ink">
                  Recent Businesses
                </h3>
                <button
                  type="button"
                  onClick={() => setTab("businesses")}
                  className="text-[12px] text-[var(--primary)] hover:underline"
                >
                  View all ({data.businesses.length}) →
                </button>
              </div>

              <div className="divide-y divide-line mt-2">
                {data.businesses.slice(0, 5).map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between gap-3 text-[12.5px]">
                    <div>
                      <span className="font-medium text-ink block">{b.name}</span>
                      <span className="text-[11.5px] text-ink-3">{b.ownerEmail}</span>
                    </div>
                    <div className="text-right">
                      <span
                        className={[
                          "inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                          b.isComplete
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            : "bg-amber-50 text-amber-800",
                        ].join(" ")}
                      >
                        {b.isComplete ? "Complete" : "Exploring"}
                      </span>
                      <span className="block text-[11px] text-ink-3 mt-0.5">
                        {b.docCount} docs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent API Receipts */}
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <h3 className="text-[15px] font-medium text-ink">
                  Recent Storefront API Receipts
                </h3>
                <button
                  type="button"
                  onClick={() => setTab("api")}
                  className="text-[12px] text-[var(--primary)] hover:underline"
                >
                  View all ({data.apiReceipts.length}) →
                </button>
              </div>

              <div className="divide-y divide-line mt-2">
                {data.apiReceipts.slice(0, 5).map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-[12.5px]">
                    <div>
                      <span className="font-mono font-medium text-ink block">{r.receiptNumber}</span>
                      <span className="text-[11.5px] text-ink-3">
                        {r.businessName} · {r.customerName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium text-ink block">
                        ₦{r.totalAmount.toLocaleString()}
                      </span>
                      <span
                        className={[
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium mt-0.5",
                          r.isTest
                            ? "bg-amber-50 text-amber-800"
                            : "bg-[var(--success-bg)] text-[var(--success)]",
                        ].join(" ")}
                      >
                        {r.isTest ? "Test Mode" : "Live"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "businesses" && (
        <div className="animate-in fade-in duration-200">
          <BusinessesTable businesses={data.businesses} />
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="animate-in fade-in duration-200">
          <SubscriptionsTable
            subscriptions={data.subscriptions}
            events={data.subscriptionEvents}
          />
        </div>
      )}

      {tab === "api" && (
        <div className="animate-in fade-in duration-200">
          <ApiReceiptsTable
            apiKeys={data.apiKeys}
            receipts={data.apiReceipts}
          />
        </div>
      )}

      {tab === "branding" && (
        <div className="max-w-[720px] mx-auto space-y-6 animate-in fade-in duration-200">
          <LogoManager currentUrl={logoUrl} />
        </div>
      )}
    </div>
  );
}
