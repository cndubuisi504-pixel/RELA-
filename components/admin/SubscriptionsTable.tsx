"use client";

import { useState } from "react";
import type { AdminSubscription, AdminSubscriptionEvent } from "@/lib/admin/types";

export function SubscriptionsTable({
  subscriptions,
  events,
}: {
  subscriptions: AdminSubscription[];
  events: AdminSubscriptionEvent[];
}) {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "events">("subscriptions");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const totalSubRevenue = subscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.amountKobo / 100, 0);

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
              Active Subscribers
            </span>
            <p className="num text-[20px] font-semibold text-ink leading-tight">
              {activeSubs}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
              Monthly Plan Price
            </span>
            <p className="num text-[20px] font-semibold text-ink leading-tight">
              ₦2,500 <span className="text-[12px] font-normal text-ink-3">/mo</span>
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
              Total Active MRR
            </span>
            <p className="num text-[20px] font-semibold text-[var(--success)] leading-tight">
              ₦{totalSubRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("subscriptions")}
            className={[
              "rounded-lg px-3 py-1 transition-all",
              activeTab === "subscriptions"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-3 hover:text-ink",
            ].join(" ")}
          >
            Subscriptions ({subscriptions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={[
              "rounded-lg px-3 py-1 transition-all",
              activeTab === "events"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-3 hover:text-ink",
            ].join(" ")}
          >
            Paystack Webhook Logs ({events.length})
          </button>
        </div>
      </div>

      {copiedRef && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-ink px-3 py-1.5 text-[12px] text-white shadow-lg animate-in fade-in">
          Copied reference to clipboard!
        </div>
      )}

      {activeTab === "subscriptions" ? (
        /* Subscriptions Table */
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                <th className="py-3 px-4">Business / Subscriber</th>
                <th className="py-3 px-4">Plan &amp; Provider</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Paystack Reference</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-3 text-[13px]">
                    No subscriptions recorded yet.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-ink block text-[13px]">
                        {s.businessName}
                      </span>
                      <span className="text-[11.5px] font-mono text-ink-3 block">
                        {s.ownerEmail}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium capitalize text-ink">
                        {s.plan}
                      </span>
                      <span className="text-[11px] text-ink-3 block capitalize">
                        via {s.provider}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
                          s.status === "active"
                            ? "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]"
                            : s.status === "pending"
                              ? "bg-amber-50 text-amber-800 border border-amber-300"
                              : "bg-surface-2 text-ink-3 border border-line",
                        ].join(" ")}
                      >
                        {s.status === "active" ? "✓ Active" : s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-ink">
                      ₦{(s.amountKobo / 100).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => copyRef(s.providerReference)}
                        className="font-mono text-[11px] text-ink-2 hover:text-[var(--primary)] flex items-center gap-1"
                        title="Click to copy reference"
                      >
                        <span>{s.providerReference}</span>
                        <span className="opacity-50 text-[10px]">📋</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-[11.5px] text-ink-2 whitespace-nowrap">
                      {s.startedAt && s.endsAt ? (
                        <>
                          <span>
                            {new Date(s.startedAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {" → "}
                          <span className="font-medium text-ink">
                            {new Date(s.endsAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-3 italic">Pending activation</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-ink-3 text-[11.5px]">
                      {new Date(s.createdAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Paystack Webhook Logs Table */
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Status &amp; Diagnostics</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-3 text-[13px]">
                    No webhook events recorded yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[12px] font-medium text-ink">
                      {e.eventType}
                    </td>
                    <td className="py-3.5 px-4 text-ink-2 font-mono text-[11.5px]">
                      {e.customerEmail || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-ink">
                      {e.amountKobo ? `₦${(e.amountKobo / 100).toLocaleString()}` : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => copyRef(e.reference)}
                        className="font-mono text-[11px] text-ink-2 hover:text-[var(--primary)] flex items-center gap-1"
                        title="Click to copy reference"
                      >
                        <span>{e.reference}</span>
                        <span className="opacity-50 text-[10px]">📋</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
                            e.status === "success"
                              ? "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]"
                              : "bg-red-50 text-red-700 border border-red-200",
                          ].join(" ")}
                        >
                          {e.status}
                        </span>
                        {e.processingError && (
                          <p className="text-[11px] font-mono text-red-600 max-w-xs">
                            {e.processingError}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-ink-3 text-[11.5px]">
                      {new Date(e.createdAt).toLocaleString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
