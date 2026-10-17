import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { CheckIcon } from "@/components/ui/icons";

const steps = [
  { key: "business", label: "Business", href: "/setup/business" },
  { key: "branding", label: "Branding", href: "/setup/branding" },
  { key: "preferences", label: "Preferences", href: "/setup/preferences" },
] as const;

export function SetupShell({
  current,
  title,
  subtitle,
  children,
}: {
  current: (typeof steps)[number]["key"];
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] -z-10"
        style={{ background: "radial-gradient(50% 60% at 50% 0%, var(--glow) 0%, transparent 75%)" }}
      />
      <header className="container-x flex h-16 items-center justify-between md:h-[72px]">
        <Logo markSize={24} textClassName="text-[21px]" />
        <span className="text-[12.5px] text-ink-3">
          Step {currentIndex + 1} of {steps.length}
        </span>
      </header>

      <div className="container-x pb-20">
        <ol className="mt-2 flex items-center gap-2" aria-label="Setup progress">
          {steps.map((step, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={step.key} className="flex flex-1 items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium",
                    done
                      ? "border-transparent bg-[var(--success)] text-white"
                      : active
                        ? "border-transparent bg-primary text-[var(--primary-ink)]"
                        : "border-line bg-surface text-ink-3",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <CheckIcon size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`hidden text-[13px] sm:block ${active ? "font-medium text-ink" : "text-ink-3"}`}
                >
                  {step.label}
                </span>
                {i < steps.length - 1 && <span aria-hidden className="h-px flex-1 bg-line" />}
              </li>
            );
          })}
        </ol>

        <div className="mx-auto mt-8 max-w-[560px] sm:mt-12">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.03em] text-ink">{title}</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
