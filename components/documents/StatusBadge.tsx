import { statusMeta } from "@/lib/documents/status";
import { CheckIcon } from "@/components/ui/icons";

const toneClass: Record<string, string> = {
  success: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]",
  warning: "border-[var(--warning)]/30 bg-[var(--warning-bg)] text-[var(--warning)]",
  danger: "border-[var(--danger)]/30 bg-[var(--danger-bg)] text-[var(--danger)]",
  info: "border-[var(--primary)]/35 bg-[var(--primary-soft)] text-[var(--accent-text)]",
  neutral: "border-line bg-surface-2 text-ink-3",
};

/** Status is never colour alone: every badge carries a label, and "paid" a check icon. */
export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const meta = statusMeta[status] ?? { label: status, tone: "neutral" as const };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${toneClass[meta.tone]} ${className}`}
    >
      {meta.tone === "success" && <CheckIcon size={11} strokeWidth={3} />}
      {meta.label}
    </span>
  );
}
