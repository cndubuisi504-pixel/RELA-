import Link from "next/link";
import { Logo } from "@/components/branding/Logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col">
      <div className="container-x flex h-16 items-center md:h-[72px]">
        <Logo markSize={25} textClassName="text-[22px]" />
      </div>
      <div className="container-x flex flex-1 flex-col items-center justify-center py-16 text-center">
        <p className="eyebrow">404</p>
        <h1 className="h-section mt-4 max-w-[20ch] text-ink">This page isn&apos;t on the desk.</h1>
        <p className="lede mt-4 max-w-[44ch]">
          The link may be old, or the page moved. Your documents are safe either way.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/support" className="btn btn-ghost">
            Get support
          </Link>
        </div>
      </div>
    </main>
  );
}
