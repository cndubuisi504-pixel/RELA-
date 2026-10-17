import Link from "next/link";
import { Logo } from "@/components/branding/Logo";
import { Footer } from "@/components/landing/Footer";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-line">
        <div className="container-x flex h-16 items-center justify-between md:h-[72px]">
          <Logo markSize={24} textClassName="text-[22px]" />
          <Link href="/" className="inline-flex min-h-11 items-center text-[14px] text-ink-2 hover:text-ink">
            Back to home
          </Link>
        </div>
      </header>

      <main id="main" className="container-x py-14 md:py-20">
        <div className="mx-auto max-w-[760px]">
          <p className="eyebrow">Legal</p>
          <h1 className="h-section mt-4 text-ink">{title}</h1>
          <p className="mt-3 text-[13px] text-ink-3">Last updated: {updated}</p>
          <div className="legal-prose mt-10">{children}</div>
          <p className="mt-12 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[12.5px] leading-relaxed text-ink-3">
            Working draft prepared for Rela&apos;s launch. Have it reviewed by a Nigerian
            lawyer before you rely on it.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
