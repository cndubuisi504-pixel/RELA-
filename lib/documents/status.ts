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
