"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CloseIcon } from "@/components/ui/icons";

const options = [
  { type: "receipt", letter: "R", title: "Receipt", body: "Confirm a payment you’ve received." },
  { type: "invoice", letter: "I", title: "Invoice", body: "Ask a customer to pay, and track what’s left." },
  { type: "quotation", letter: "Q", title: "Quotation", body: "Price a job before the work starts." },
] as const;

export function CreateSheet({
  open,
  onClose,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
}) {
  const firstRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        className="anim-fade relative w-full max-w-[440px] rounded-t-[1.75rem] border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-2)] sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="create-title" className="text-[20px] font-medium tracking-tight text-ink">
              Create a document
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Pick one — you can convert between them later.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-2"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {options.map((o, i) => (
            <li key={o.type}>
              <Link
                ref={i === 0 ? firstRef : undefined}
                href={disabled ? "#" : `/documents/new?type=${o.type}`}
                aria-disabled={disabled}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                  else onClose();
                }}
                className={[
                  "flex items-center gap-3 rounded-2xl border border-line p-3.5 transition-colors",
                  disabled ? "cursor-not-allowed opacity-55" : "hover:border-[var(--border-strong)] hover:bg-surface-2",
                ].join(" ")}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[15px] font-medium text-[var(--accent-text)]">
                  {o.letter}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-ink">{o.title}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-3">{o.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {disabled && (
          <p className="mt-3 rounded-xl bg-[var(--warning-bg)] px-3 py-2.5 text-[12.5px] text-[var(--warning)]">
            You&apos;ve used all 5 free documents this month. Upgrade to Starter for unlimited
            documents, or wait until next month.
          </p>
        )}
      </div>
    </div>
  );
}
