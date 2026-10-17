import { formatKobo } from "@/lib/money";
import { CheckIcon, ShieldCheckIcon } from "@/components/ui/icons";

const items = [
  { name: "Ankara fabric", detail: "6 yards", kobo: 720_0000 },
  { name: "Delivery to Yaba", detail: "Same day", kobo: 120_0000 },
];

const total = items.reduce((sum, i) => sum + i.kobo, 0);

/**
 * A real HTML document card (not an image) so it stays sharp, readable and
 * translatable. Shows the receipt exactly the way Rela renders it.
 */
export function DocumentVisual() {
  return (
    <figure
      aria-label={`Example Rela receipt: Adaeze Fabrics, receipt REC-20261017-0004, total paid ${formatKobo(total)}`}
      className="relative mx-auto w-full max-w-[420px]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-14 -z-10 opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side at 60% 40%, var(--glow), transparent 72%)",
        }}
      />

      <div className="relative -rotate-1 rounded-[26px] border border-line bg-surface p-6 shadow-[var(--shadow-2)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-[17px] font-medium text-cocoa dark:text-ink">
              A
            </div>
            <div>
              <p className="text-[15px] font-medium leading-tight text-ink">Adaeze Fabrics</p>
              <p className="mt-0.5 text-[12.5px] leading-tight text-ink-3">Ikeja, Lagos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="eyebrow text-[10px]">Receipt</p>
            <p className="num mt-1 text-[11.5px] text-ink-3">REC-20261017-0004</p>
          </div>
        </div>

        <div className="my-5 border-t border-dashed border-line" />

        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.name} className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] text-ink">{item.name}</p>
                <p className="text-[12px] text-ink-3">{item.detail}</p>
              </div>
              <p className="num shrink-0 text-[14px] text-ink">{formatKobo(item.kobo)}</p>
            </li>
          ))}
        </ul>

        <div className="my-5 border-t border-line" />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] text-ink-3">Total paid</p>
            <p className="num mt-1 text-[27px] font-medium leading-none tracking-tight text-ink">
              {formatKobo(total)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--success)]">
            <CheckIcon size={13} />
            Paid in full
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
            <ShieldCheckIcon size={14} className="text-[var(--success)]" />
            Verified with rela.
          </span>
          <span className="num truncate text-[11px] text-ink-3">rela.ng/r/7k2m4x</span>
        </div>
      </div>

      <div className="absolute -bottom-10 -left-2 flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-[var(--shadow-2)] sm:-bottom-8 sm:-left-7">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
          <CheckIcon size={16} />
        </span>
        <div>
          <p className="text-[13px] font-medium leading-tight text-ink">Payment received</p>
          <p className="num mt-0.5 text-[12px] leading-tight text-ink-3">
            {formatKobo(total)} · Bank transfer
          </p>
        </div>
      </div>
    </figure>
  );
}
