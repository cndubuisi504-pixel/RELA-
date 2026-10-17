"use client";

import { useActionState } from "react";
import { updateDocumentStatus, type ConversionState } from "@/lib/documents/conversions";
import { Alert } from "@/components/ui/Alert";

type Action = { status: string; label: string; primary?: boolean };

function actionsFor(type: "receipt" | "invoice" | "quotation", status: string): Action[] {
  if (type === "quotation") {
    if (status === "draft" || status === "sent") {
      return [
        ...(status === "draft" ? [{ status: "sent", label: "Mark as sent" }] : []),
        { status: "accepted", label: "Mark accepted" },
        { status: "declined", label: "Mark declined" },
      ];
    }
    return [];
  }
  if (type === "invoice" && status === "draft") {
    return [{ status: "sent", label: "Mark as sent" }];
  }
  return [];
}

export function StatusButtons({
  documentId,
  type,
  status,
}: {
  documentId: string;
  type: "receipt" | "invoice" | "quotation";
  status: string;
}) {
  const [state, formAction] = useActionState<ConversionState, FormData>(
    updateDocumentStatus,
    null,
  );
  const actions = actionsFor(type, status);
  if (actions.length === 0 && !state) return null;

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((a) => (
          <form key={a.status} action={formAction}>
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="status" value={a.status} />
            <button type="submit" className="btn btn-ghost btn-block">
              {a.label}
            </button>
          </form>
        ))}
      </div>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
    </div>
  );
}
