import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { ArrowRightIcon, WhatsAppIcon } from "@/components/ui/icons";
import { site, whatsappLink } from "@/lib/site";

/**
 * Temporary gate for /signup and /login while Supabase auth is wired up in the
 * next build stage. Honest about the state, and still gives people a path in.
 */
export function EarlyAccess({ mode }: { mode: "signup" | "login" }) {
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent(
    mode === "signup" ? "Early access to Rela" : "Rela account access",
  )}`;

  return (
    <main id="main" className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 0%, var(--glow) 0%, transparent 70%)",
        }}
      />
      <div className="container-x flex h-16 items-center md:h-[72px]">
        <Logo markSize={25} textClassName="text-[22px]" />
      </div>

      <div className="container-x flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[520px] rounded-[2rem] border border-line bg-surface p-7 shadow-[var(--shadow-1)] sm:p-10">
          <p className="eyebrow">Private build</p>
          <h1 className="h-section mt-4 text-ink">
            {mode === "signup" ? "Accounts open with the next release." : "Log in opens with the next release."}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            Rela is being finished in stages. The landing page and design system are live; sign-up,
            business setup and document creation are next. Want to be first in? Send us a message
            and we'll onboard you by hand.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href={mailto} className="btn btn-primary">
              {mode === "signup" ? "Request early access" : "Request access"}
              <ArrowRightIcon size={16} />
            </a>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              <WhatsAppIcon size={16} />
              WhatsApp
            </a>
          </div>

          <p className="mt-6 text-[13px] text-ink-3">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-[var(--accent-text)] underline underline-offset-4">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New to Rela?{" "}
                <Link href="/signup" className="text-[var(--accent-text)] underline underline-offset-4">
                  Start free
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="container-x flex h-16 items-center">
        <Link href="/" className="inline-flex min-h-11 items-center text-[13.5px] text-ink-3 hover:text-ink">
          ← Back to rela.ng
        </Link>
      </div>
    </main>
  );
}
