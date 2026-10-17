"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon } from "@/components/ui/icons";

const docs = [
  {
    key: "receipt",
    letter: "R",
    title: "Receipt",
    description: "Confirm what your customer paid.",
    example: "Ankara fabric × 6 · Paid ₦84,000",
    article: "a",
    chip: "bg-[var(--primary-soft)] text-[var(--accent-text)]",
  },
  {
    key: "invoice",
    letter: "I",
    title: "Invoice",
    description: "Clearly request payment and track what remains outstanding.",
    example: "Website design · ₦350,000 · ₦150,000 left",
    article: "an",
    chip: "bg-[var(--surface-2)] text-[var(--cocoa)] dark:text-ink",
  },
  {
    key: "quotation",
    letter: "Q",
    title: "Quotation",
    description: "Present the price of a job before work begins.",
    example: "3-bedroom repaint · valid for 14 days",
    article: "a",
    chip: "bg-[var(--canvas)] text-ink border border-line",
  },
];

export function OneForAll() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <section id="one-for-all" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="eyebrow">One for all</p>
          <h2 className="h-section mt-4 text-ink">One For All Your Business Needs</h2>
          <p className="lede mx-auto mt-4 max-w-[46ch]">
            All your business documents in one place.
          </p>
        </div>

        <div className="mt-12 md:mt-16">
          {!open ? (
            <div className="mx-auto max-w-[560px]">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={false}
                aria-controls={panelId}
                className="group block w-full rounded-[28px] p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <span className="relative block h-[212px] sm:h-[224px]">
                  {[
                    {
                      d: docs[2],
                      wrap: "translate(-58%, -16px) rotate(-8deg) scale(.88)",
                      z: 1,
                      dim: "opacity-95",
                    },
                    {
                      d: docs[1],
                      wrap: "translate(-42%, -6px) rotate(6deg) scale(.94)",
                      z: 2,
                      dim: "opacity-95",
                    },
                    {
                      d: docs[0],
                      wrap: "translate(-50%, 8px) rotate(0deg) scale(1)",
                      z: 3,
                      dim: "",
                    },
                  ].map(({ d, wrap, z, dim }) => (
                    <span
                      key={d.key}
                      aria-hidden
                      className={`stack-card absolute left-1/2 top-0 block w-[74%] max-w-[320px] rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-1)] ${dim}`}
                      style={{ zIndex: z, transform: wrap }}
                    >
                      <span className="flex items-start justify-between">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-[13.5px] font-medium ${d.chip}`}
                        >
                          {d.letter}
                        </span>
                        <span className="eyebrow text-[9px]">{d.title}</span>
                      </span>
                      <span className="mt-4 block space-y-2">
                        <span className="block h-1.5 w-4/5 rounded-full bg-surface-2" />
                        <span className="block h-1.5 w-3/5 rounded-full bg-surface-2" />
                      </span>
                      <span className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <span className="block h-1.5 w-2/5 rounded-full bg-surface-2" />
                        <span className="block h-1.5 w-1/5 rounded-full bg-surface-2" />
                      </span>
                    </span>
                  ))}
                </span>
              </button>

              <div className="mt-6 flex flex-col items-center gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="btn btn-ghost btn-sm"
                  aria-expanded={false}
                  aria-controls={panelId}
                >
                  <PlusIcon size={16} />
                  Open the stack
                </button>
                <p className="text-[13px] text-ink-3">
                  Three documents, one system. Tap to open.
                </p>
              </div>
            </div>
          ) : (
            <div id={panelId} className="anim-fade">
              <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
                {docs.map((doc) => (
                  <li
                    key={doc.key}
                    className="flex flex-col rounded-[24px] border border-line bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-1)] sm:p-7"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl text-[16px] font-medium ${doc.chip}`}
                      aria-hidden
                    >
                      {doc.letter}
                    </span>
                    <h3 className="mt-5 text-[21px] font-medium tracking-tight text-ink">
                      {doc.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{doc.description}</p>
                    <p className="mt-5 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink-3">
                      {doc.example}
                    </p>
                    <Link
                      href="/signup"
                      className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--accent-text)] hover:underline"
                    >
                      Create {doc.article} {doc.title.toLowerCase()}
                      <ArrowRightIcon size={15} />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost btn-sm"
                  aria-expanded
                  aria-controls={panelId}
                >
                  Stack them back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
