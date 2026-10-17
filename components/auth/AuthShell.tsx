import Link from "next/link";
import { Logo } from "@/components/branding/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(46% 38% at 50% 0%, var(--glow) 0%, transparent 70%)",
        }}
      />
      <div className="container-x flex h-16 items-center md:h-[72px]">
        <Logo markSize={25} textClassName="text-[22px]" />
      </div>

      <div className="container-x flex flex-1 items-start justify-center pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[460px]">
          <div className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[var(--shadow-1)] sm:p-8">
            <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">{title}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-[13.5px] text-ink-3">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

export function AuthFooterLink({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <span>
      {prompt}{" "}
      <Link href={href} className="inline-flex min-h-11 items-center font-medium text-[var(--accent-text)] underline-offset-4 hover:underline">
        {label}
      </Link>
    </span>
  );
}
