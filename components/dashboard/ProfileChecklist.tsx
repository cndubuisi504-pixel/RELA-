"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";
import type { BusinessProfileCheck } from "@/lib/business/guard";

export function ProfileChecklist({
  profileCheck,
}: {
  profileCheck: BusinessProfileCheck;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Allow users to collapse or dismiss
  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem("rela_checklist_dismissed") === "true";
      const isCollapsed = localStorage.getItem("rela_checklist_collapsed") === "true";
      setDismissed(isDismissed);
      setCollapsed(isCollapsed);
    } catch {
      // localStorage unavailable in some private browsing contexts
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("rela_checklist_dismissed", "true");
    } catch {}
  };

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("rela_checklist_collapsed", String(next));
    } catch {}
  };

  // If already 100% complete or permanently dismissed by user, do not render
  if (profileCheck.isComplete || dismissed) {
    return null;
  }

  return (
    <section
      aria-label="Profile setup checklist"
      className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-1)] transition-all sm:p-6"
    >
      {/* Background soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--primary-soft)] opacity-40 blur-2xl"
      />

      {/* Header with Title and Progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
              ✨
            </span>
            <h2 className="text-[15px] font-semibold text-ink sm:text-[16px]">
              Complete your business profile
            </h2>
            <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--primary)]">
              {profileCheck.percentage}% done
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Add optional details anytime to brand your documents and enable direct bank transfers.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="btn btn-ghost btn-sm text-[12px] text-ink-3 hover:text-ink"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? "Show tasks ↓" : "Hide tasks ↑"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="btn btn-ghost btn-sm text-[12px] text-ink-3 hover:text-ink"
            title="Dismiss checklist"
            aria-label="Dismiss checklist"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all duration-500 ease-out"
          style={{ width: `${Math.max(8, profileCheck.percentage)}%` }}
        />
      </div>

      {/* Checklist items */}
      {!collapsed && (
        <div className="mt-4 grid gap-2.5 pt-2 sm:grid-cols-2">
          {profileCheck.steps.map((step) => {
            const isDone = step.isCompleted;

            return (
              <div
                key={step.id}
                className={[
                  "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                  isDone
                    ? "border-line/40 bg-surface-2/30 text-ink-3"
                    : "border-line bg-surface hover:border-[var(--border-strong)]",
                ].join(" ")}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={[
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]",
                      isDone
                        ? "bg-[var(--success)] text-white"
                        : "border border-line bg-surface text-ink-3",
                    ].join(" ")}
                  >
                    {isDone ? <CheckIcon size={12} strokeWidth={3} /> : "○"}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={[
                        "text-[13px] font-medium leading-snug truncate",
                        isDone ? "text-ink-3 line-through" : "text-ink",
                      ].join(" ")}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11.5px] leading-snug text-ink-3 truncate">
                      {step.description}
                    </p>
                  </div>
                </div>

                {!isDone && (
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-2 hover:text-[var(--accent-text)]"
                  >
                    Add →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
