export type DocType = "receipt" | "invoice" | "quotation";

export const typeMeta: Record<DocType, { label: string; plural: string; prefix: string }> = {
  receipt: { label: "Receipt", plural: "Receipts", prefix: "REC" },
  invoice: { label: "Invoice", plural: "Invoices", prefix: "INV" },
  quotation: { label: "Quotation", plural: "Quotations", prefix: "QUO" },
};

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

export const statusMeta: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  balance_owed: { label: "Balance owed", tone: "warning" },
  partially_paid: { label: "Partially paid", tone: "warning" },
  overdue: { label: "Overdue", tone: "danger" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  converted: { label: "Converted", tone: "info" },
  void: { label: "Void", tone: "neutral" },
};

export function statusLabel(status: string): string {
  return statusMeta[status]?.label ?? status;
}

export type LifecycleDoc = {
  document_type: DocType;
  status: string;
  valid_until: string | null;
  due_date: string | null;
  balance_remaining_kobo: number;
};

/**
 * The status we show, with time facts applied. Stored status never ages on its own:
 * a quotation a customer never answered goes stale at valid_until (as long as it was
 * only drafted/sent — accepted, declined and converted quotes are settled), and an
 * unpaid invoice goes overdue after its due date. Drafts that are still open are
 * treated as expired/overdue so the owner sees reality instead of a stale "Sent".
 */
export function effectiveStatus(doc: LifecycleDoc): string {
  const today = new Date().toISOString().slice(0, 10); // UTC date, matches date columns

  if (
    doc.document_type === "quotation" &&
    doc.valid_until &&
    doc.valid_until < today &&
    ["draft", "sent"].includes(doc.status)
  ) {
    return "expired";
  }

  if (
    doc.document_type === "invoice" &&
    doc.due_date &&
    doc.due_date < today &&
    doc.balance_remaining_kobo > 0 &&
    ["draft", "sent", "partially_paid"].includes(doc.status)
  ) {
    return "overdue";
  }

  return doc.status;
}
