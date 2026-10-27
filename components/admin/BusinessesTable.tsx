"use client";

import { useState } from "react";
import type { AdminBusiness } from "@/lib/admin/types";

type FilterType = "all" | "complete" | "incomplete" | "has_docs" | "starter";

export function BusinessesTable({ businesses }: { businesses: AdminBusiness[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filtered = businesses.filter((b) => {
    // Search query
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      b.name.toLowerCase().includes(query) ||
      b.ownerName.toLowerCase().includes(query) ||
      b.ownerEmail.toLowerCase().includes(query) ||
      b.phone.toLowerCase().includes(query) ||
      (b.bankName && b.bankName.toLowerCase().includes(query)) ||
      (b.bankAccountNumber && b.bankAccountNumber.includes(query)) ||
      b.address.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    // Filter type
    if (filter === "complete") return b.isComplete;
    if (filter === "incomplete") return !b.isComplete;
    if (filter === "has_docs") return b.docCount > 0;
    if (filter === "starter") return b.plan === "starter";
    return true;
  });

  const countComplete = businesses.filter((b) => b.isComplete).length;
  const countIncomplete = businesses.filter((b) => !b.isComplete).length;
  const countWithDocs = businesses.filter((b) => b.docCount > 0).length;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business, owner, phone, bank…"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-[var(--primary)] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-3 hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={[
              "rounded-lg px-2.5 py-1 font-medium transition-colors",
              filter === "all"
                ? "bg-ink text-canvas"
                : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
            ].join(" ")}
          >
            All ({businesses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("complete")}
            className={[
              "rounded-lg px-2.5 py-1 font-medium transition-colors",
              filter === "complete"
                ? "bg-[var(--success)] text-white"
                : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
            ].join(" ")}
          >
            Setup Complete ({countComplete})
          </button>
          <button
            type="button"
            onClick={() => setFilter("incomplete")}
            className={[
              "rounded-lg px-2.5 py-1 font-medium transition-colors",
              filter === "incomplete"
                ? "bg-amber-600 text-white"
                : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
            ].join(" ")}
          >
            Exploring ({countIncomplete})
          </button>
          <button
            type="button"
            onClick={() => setFilter("has_docs")}
            className={[
              "rounded-lg px-2.5 py-1 font-medium transition-colors",
              filter === "has_docs"
                ? "bg-ink text-canvas"
                : "border border-line bg-surface text-ink-2 hover:bg-surface-2",
            ].join(" ")}
          >
            With Documents ({countWithDocs})
          </button>
        </div>
      </div>

      {/* Copy notification */}
      {copiedText && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-ink px-3 py-1.5 text-[12px] text-white shadow-lg animate-in fade-in">
          Copied {copiedText} to clipboard!
        </div>
      )}

      {/* Businesses Table */}
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
        <table className="w-full text-left text-[12.5px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface-2/60 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
              <th className="py-3 px-4">Business &amp; Owner</th>
              <th className="py-3 px-4">Contact Info</th>
              <th className="py-3 px-4">Setup Status</th>
              <th className="py-3 px-4">Bank Details</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4 text-right">Docs &amp; Volume</th>
              <th className="py-3 px-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-3 text-[13px]">
                  No businesses found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-surface-2/40 transition-colors">
                  {/* Business & Owner */}
                  <td className="py-3.5 px-4 align-top">
                    <div>
                      <span className="font-semibold text-ink text-[13.5px] block">
                        {b.name}
                      </span>
                      <span className="text-[12px] text-ink-2 block mt-0.5">
                        {b.ownerName}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(b.ownerEmail, b.ownerEmail)}
                        title="Click to copy email"
                        className="text-[11px] font-mono text-ink-3 hover:text-[var(--primary)] flex items-center gap-1 mt-0.5"
                      >
                        <span>{b.ownerEmail}</span>
                        <span className="opacity-60 text-[10px]">📋</span>
                      </button>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-0.5 max-w-[180px]">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[11.5px] text-ink">
                          {b.phone}
                        </span>
                        {b.phone && b.phone !== "+2348000000000" && (
                          <a
                            href={`https://wa.me/${b.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[var(--success)] hover:underline"
                            title="Chat on WhatsApp"
                          >
                            💬
                          </a>
                        )}
                      </div>
                      <p className="text-[11.5px] text-ink-3 line-clamp-2" title={b.address}>
                        {b.address}
                      </p>
                    </div>
                  </td>

                  {/* Setup Status */}
                  <td className="py-3.5 px-4 align-top">
                    {b.isComplete ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--success)]">
                        <span>✓</span> Complete
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          <span>!</span> Exploring
                        </span>
                        <p className="text-[10.5px] text-amber-900/80 leading-tight">
                          Missing: {b.missingFields.join(", ")}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* Bank Details */}
                  <td className="py-3.5 px-4 align-top">
                    {b.bankAccountNumber ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink text-[12px]">
                            {b.bankName || "Bank"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(b.bankAccountNumber!, "Account number")}
                          className="font-mono text-[11.5px] text-ink-2 hover:text-[var(--primary)] flex items-center gap-1"
                          title="Click to copy account number"
                        >
                          <span>{b.bankAccountNumber}</span>
                          <span className="opacity-60 text-[10px]">📋</span>
                        </button>
                        {b.bankAccountName && (
                          <p className="text-[10.5px] text-ink-3 line-clamp-1" title={b.bankAccountName}>
                            {b.bankAccountName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-ink-3 italic">None added</span>
                    )}
                  </td>

                  {/* Plan */}
                  <td className="py-3.5 px-4 align-top">
                    <span
                      className={[
                        "inline-block rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
                        b.plan === "starter"
                          ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold"
                          : "bg-surface-2 text-ink-3",
                      ].join(" ")}
                    >
                      {b.plan}
                    </span>
                  </td>

                  {/* Docs & Volume */}
                  <td className="py-3.5 px-4 align-top text-right">
                    <span className="font-semibold text-ink text-[13px] block">
                      {b.docCount} doc{b.docCount === 1 ? "" : "s"}
                    </span>
                    {b.totalVolumeKobo > 0 && (
                      <span className="text-[11.5px] font-mono text-[var(--success)] block mt-0.5">
                        ₦{(b.totalVolumeKobo / 100).toLocaleString()}
                      </span>
                    )}
                  </td>

                  {/* Joined Date */}
                  <td className="py-3.5 px-4 align-top whitespace-nowrap text-ink-3 text-[11.5px]">
                    {new Date(b.createdAt).toLocaleDateString("en-NG", {
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
    </div>
  );
}
