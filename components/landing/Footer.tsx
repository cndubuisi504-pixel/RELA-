import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { WhatsAppIcon } from "@/components/ui/icons";
import { site, whatsappLink } from "@/lib/site";

/**
 * Social icons are intentionally omitted until real X / Instagram accounts
 * exist. Placeholder or dead social links are worse than none.
 */
export function Footer() {
  return (
    <footer className="bg-[var(--invert-bg)] text-[var(--invert-text)]">
      <div className="container-x py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo href="/" tone="invert" markSize={26} textClassName="text-[23px]" />
            <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-[var(--invert-muted)]">
              Create, share, and track professional business documents in seconds.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-[14px]">
              <a
                href={`mailto:${site.email}`}
                className="inline-flex min-h-11 w-fit items-center text-[var(--invert-muted)] underline-offset-4 hover:text-[var(--invert-text)] hover:underline"
              >
                {site.email}
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-fit items-center gap-2 text-[var(--invert-muted)] hover:text-[var(--invert-text)]"
              >
                <WhatsAppIcon size={16} />
                <span className="num">+234 915 323 0482</span>
              </a>
            </div>
          </div>

          <nav aria-label="Product">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--invert-muted)]">
              Product
            </h2>
            <ul className="mt-2 text-[14.5px]">
              <li>
                <Link href="/#pricing" className="inline-flex min-h-11 items-center hover:text-white hover:underline underline-offset-4">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="inline-flex min-h-11 items-center hover:text-white hover:underline underline-offset-4">
                  API Docs
                </Link>
              </li>
              <li>
                <Link href="/support" className="inline-flex min-h-11 items-center hover:text-white hover:underline underline-offset-4">
                  Contact Support
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--invert-muted)]">
              Legal
            </h2>
            <ul className="mt-2 text-[14.5px]">
              <li>
                <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-white hover:underline underline-offset-4">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-white hover:underline underline-offset-4">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--invert-border)] pt-6 text-[12.5px] text-[var(--invert-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Rela. All rights reserved.</p>
          <p>Made in Lagos, Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
