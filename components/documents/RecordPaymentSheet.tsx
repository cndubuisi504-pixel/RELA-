"use client";

import { useActionState, useEffect, useState } from "react";
import { recordPayment, type PaymentState } from "@/lib/documents/conversions";
import { formatKobo } from "@/lib/money";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { CloseIcon } from "@/components/ui/icons";

const methods = ["Cash", "Bank transfer", "POS", "Mobile money"] as const;

export function RecordPaymentSheet({
  documentId,
  number,
  balanceKobo,
  customerName,
}: {
  documentId: string;
  number: string;
  balanceKobo: number;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>("Bank transfer");
  const [state, formAction] = useActionState<PaymentState, FormData>(recordPayment, null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-block">
        Record a payment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-title"
            className="anim-fade relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[1.75rem] border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-2)] sm:rounded-[1.75rem]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="payment-title" className="text-[20px] font-medium tracking-tight text-ink">
                  Record a payment
                </h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  {customerName} · <span className="num">{number}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-2"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
              <p className="text-[11.5px] text-ink-3">Outstanding balance</p>
              <p className="num text-[19px] font-medium text-ink">{formatKobo(balanceKobo)}</p>
            </div>

            <form action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="documentId" value={documentId} />
              <input type="hidden" name="balanceKobo" value={String(balanceKobo)} />
              <input type="hidden" name="method" value={method} />

              <Field
                name="amount"
                label="Amount received (₦)"
                inputMode="decimal"
                autoFocus
                placeholder={String(balanceKobo / 100)}
                defaultValue={state?.amount ?? ""}
                hint="Leave blank to record the full balance."
              />

              <fieldset>
                <legend className="mb-1.5 block text-[13.5px] font-medium text-ink">
                  How was it paid?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {methods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      aria-pressed={method === m}
                      className={[
                        "min-h-11 rounded-full border px-3.5 text-[13.5px] transition-colors",
                        method === m
                          ? "border-[var(--primary)] bg-[var(--primary-soft)] font-medium text-[var(--accent-text)]"
                          : "border-line text-ink-2 hover:border-[var(--border-strong)] hover:bg-surface-2",
                      ].join(" ")}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>

              {state?.error && <Alert tone="error">{state.error}</Alert>}

              <SubmitButton pendingLabel="Creating receipt…">Create receipt</SubmitButton>
              <p className="text-center text-[11.5px] leading-relaxed text-ink-3">
                A receipt is issued and the invoice balance updates. Nothing is charged here.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
