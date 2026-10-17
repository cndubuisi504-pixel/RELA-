import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";

export function CtaBand() {
  return (
    <section className="pb-20 md:pb-28">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-[var(--invert-bg)] px-6 py-14 text-center sm:px-12 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 75% at 78% 12%, rgba(255,109,41,0.28), transparent 65%), radial-gradient(45% 60% at 10% 95%, rgba(242,235,209,0.08), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-[620px]">
            <h2 className="h-section text-[var(--invert-text)]">
              Try Rela free and generate your first 5 documents now.
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[var(--invert-muted)]">
              A quotation for the job. An invoice when it&apos;s time to pay. A receipt
              when the money lands. All in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start free
                <ArrowRightIcon size={17} />
              </Link>
              <Link
                href="/support"
                className="btn btn-lg border border-[var(--invert-border)] text-[var(--invert-text)] hover:bg-white/5"
              >
                Talk to us
              </Link>
            </div>
            <p className="mt-4 text-[12.5px] text-[var(--invert-muted)]">
              No card. No setup fee. Keep your documents forever.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
