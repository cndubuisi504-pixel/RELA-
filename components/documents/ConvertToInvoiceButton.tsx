"use client";

import { useState, useTransition } from "react";
import { convertToInvoice } from "@/lib/documents/conversions";
import { Alert } from "@/components/ui/Alert";
import { ArrowRightIcon } from "@/components/ui/icons";

export function ConvertToInvoiceButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function convert() {
    setError(null);
    startTransition(async () => {
      const result = await convertToInvoice(documentId);
      // A successful conversion redirects, so anything returned here is a problem.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={convert}
        disabled={pending}
        className="btn btn-primary btn-block"
        aria-busy={pending}
      >
        {pending ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Turning this into an invoice…
          </>
        ) : (
          <>
            Accept &amp; convert to invoice
            <ArrowRightIcon size={17} />
          </>
        )}
      </button>
      <p className="px-1 text-[11.5px] leading-relaxed text-ink-3">
        Creates a new invoice with the same customer and items. You can still send the quotation as
        it is.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
