import Link from "next/link";
import { CheckIcon, ArrowDownIcon } from "@/components/ui/icons";
import { DocumentVisual } from "@/components/landing/DocumentVisual";
import { site } from "@/lib/site";

const assurances = ["No card needed", "5 free documents", "Works on any phone"];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(58% 50% at 82% 18%, var(--glow) 0%, transparent 62%), radial-gradient(42% 38% at 8% 78%, var(--glow-soft) 0%, transparent 70%)",
        }}
      />
      <div className="container-x grid items-center gap-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Built for businesses and freelancers
          </p>

          <h1 className="h-display mt-6 text-ink">
            Create receipts, invoices &amp; quotations{" "}
            <span className="text-grad">in seconds.</span>
          </h1>

          <p className="lede mt-6 max-w-[48ch]">
            {site.description}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Start free — 5 free documents
            </Link>
            <Link href="#one-for-all" className="btn btn-ghost btn-lg">
              See how it works
              <ArrowDownIcon size={17} />
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            {assurances.map((a) => (
              <li key={a} className="flex items-center gap-1.5 text-[13px] text-ink-3">
                <CheckIcon size={14} className="text-[var(--accent-text)]" />
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <DocumentVisual />
        </div>
      </div>
    </section>
  );
}
