import { CheckIcon } from "@/components/ui/icons";

export function Alert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    error: "border-[var(--danger)]/30 bg-[var(--danger-bg)] text-[var(--danger)]",
    success: "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]",
    info: "border-line bg-surface-2 text-ink-2",
  }[tone];

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed ${styles}`}>
      {tone === "success" ? (
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
          <CheckIcon size={10} strokeWidth={3} />
        </span>
      ) : (
        <span aria-hidden className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      <span>{children}</span>
    </div>
  );
}
