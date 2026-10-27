"use client";

import { useState } from "react";
import type { AdminApiKey, AdminApiReceipt } from "@/lib/admin/types";

export function ApiReceiptsTable({
  apiKeys,
  receipts,
}: {
  apiKeys: AdminApiKey[];
  receipts: AdminApiReceipt[];
}) {
  const [activeSubTab, setActiveSubTab] = useState<"receipts" | "keys">("receipts");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "live" | "test">("all");

  const filteredReceipts = receipts.filter((r) => {
    const q = search.toLowerCase().trim();
    const matches =
      !q ||
      r.receiptNumber.toLowerCase().includes(q) ||
      (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.customerEmail && r.customerEmail.toLowerCase().includes(q)) ||
      r.businessName.toLowerCase().includes(q) ||
      r.keyName.toLowerCase().includes(q);

    if (!matches) return false;
    if (modeFilter === "live") return !r.isTest;
    if (modeFilter === "test") return r.isTest;
    return true;
  });

  const totalApiVolumeNaira = receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const liveReceiptsCount = receipts.filter((r) => !r.isTest).length;
  const testReceiptsCount = receipts.filter((r) => r.isTest).length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
              Total API Receipts
            </span>
            <p className="num text-[20px] font-semibold text-ink leading-tight">
              {receipts.length}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
              Active API Keys
            </span>
            <p className="num text-[20px] font-semibold text-ink leading-tight">
              {apiKeys.length}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-3">
              Total API Volume
            </span>
            <p className="num text-[20px] font-semibold text-[var(--success)] leading-tight">
              ₦{totalApiVolumeNaira.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveSubTab("receipts")}
            className={[
              "rounded-lg px-3 py-1 transition-all",
              activeSubTab === "receipts"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-3 hover:text-ink",
            ].join(" ")}
          >
            Receipts ({receipts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("keys")}
            className={[
              "rounded-lg px-3 py-1 transition-all",
              activeSubTab === "keys"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-3 hover:text-ink",
            ].join(" ")}
          >
            API Keys &amp; Partners ({apiKeys.length})
          </button>
        </div>
      </div>

      {activeSubTab === "receipts" ? (
        <div className="space-y-4">
          {/* Search & Mode Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt #, order, customer, partner…"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-[var(--primary)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[12px]">
              <button
                type="button"
                onClick={() => setModeFilter("all")}
                className={[
                  "rounded-lg px-2.5 py-1 font-medium transition-colors",
                  modeFilter === "all"
                    ? "bg-ink text-canvas"
                    : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
                ].join(" ")}
              >
                All ({receipts.length})
              </button>
              <button
                type="button"
                onClick={() => setModeFilter("live")}
                className={[
                  "rounded-lg px-2.5 py-1 font-medium transition-colors",
                  modeFilter === "live"
                    ? "bg-[var(--success)] text-white"
                    : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
                ].join(" ")}
              >
                Live Mode ({liveReceiptsCount})
              </button>
              <button
                type="button"
                onClick={() => setModeFilter("test")}
                className={[
                  "rounded-lg px-2.5 py-1 font-medium transition-colors",
                  modeFilter === "test"
                    ? "bg-amber-600 text-white"
                    : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
                ].join(" ")}
              >
                Test Mode ({testReceiptsCount})
              </button>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
            <table className="w-full text-left text-[12.5px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  <th className="py-3 px-4">Receipt Number</th>
                  <th className="py-3 px-4">Partner / Business</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issued At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-3 text-[13px]">
                      No storefront receipts match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {r.receiptNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-ink block">
                          {r.businessName}
                        </span>
                        <span className="text-[11px] text-ink-3 block">
                          Key: {r.keyName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-ink block">{r.customerName}</span>
                        {r.customerEmail && (
                          <span className="text-[11px] font-mono text-ink-3 block">
                            {r.customerEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        ₦{r.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                            r.isTest
                              ? "bg-amber-50 text-amber-800 border border-amber-300"
                              : "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]",
                          ].join(" ")}
                        >
                          {r.isTest ? "Test Mode" : "Live"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize",
                            r.status === "ready"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-surface-2 text-ink-3 border border-line",
                          ].join(" ")}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-ink-3 text-[11.5px]">
                        {new Date(r.createdAt).toLocaleString("en-NG", {
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
        </div>
      ) : (
        /* API Keys & Partners Table */
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                <th className="py-3 px-4">Partner Name</th>
                <th className="py-3 px-4">Key Prefix</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Rate Limit</th>
                <th className="py-3 px-4">Receipts Count</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-surface-2/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-ink text-[13px]">
                    {k.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11.5px] text-ink-2">
                    {k.keyPrefix}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                        k.isTest
                          ? "bg-amber-50 text-amber-800 border border-amber-300"
                          : "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]",
                      ].join(" ")}
                    >
                      {k.isTest ? "Test" : "Live"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11.5px] text-ink-2">
                    {k.rateLimitPerMinute} req/min
                  </td>
                  <td className="py-3 px-4 font-semibold text-ink">
                    {k.receiptsCount}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-ink-3 text-[11.5px]">
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleString("en-NG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-ink-3 text-[11.5px]">
                    {new Date(k.createdAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
