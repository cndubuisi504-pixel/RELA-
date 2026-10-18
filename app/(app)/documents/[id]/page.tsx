import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { formatKobo } from "@/lib/money";
import { effectiveStatus, typeMeta, type DocType } from "@/lib/documents/status";
import { CheckIcon, PrintIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/ui/icons";
import { ShareSheet } from "@/components/documents/ShareSheet";
import { PrintSheetView } from "@/components/documents/PrintSheetView";
import { loadPrintData } from "@/lib/documents/print-data";
import { ConvertToInvoiceButton } from "@/components/documents/ConvertToInvoiceButton";
import { RecordPaymentSheet } from "@/components/documents/RecordPaymentSheet";
import { StatusButtons } from "@/components/documents/StatusButtons";
import { site } from "@/lib/site";

export const metadata = { title: "Document" };

/** Nigerian numbers get a country code; without a phone we open WhatsApp's share sheet. */
function whatsappHref(phone: string | null, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return `https://wa.me/?text=${text}`;
  const normalized = digits.startsWith("234")
    ? digits
    : digits.startsWith("0")
      ? `234${digits.slice(1)}`
      : digits.length === 10
        ? `234${digits}`
        : digits;
  return `https://wa.me/${normalized}?text=${text}`;
}

type LinkedDoc = { id: string; document_type: DocType; document_number: string };
type ReceiptRow = {
  id: string;
  document_number: string;
  issued_date: string;
  receipt_for_payment_kobo: number | null;
  payment_method: string | null;
};

export default async function DocumentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; converted?: string; payment?: string }>;
}) {
  const { id } = await params;
  const { created, converted, payment } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, document_type, document_number, customer_name, customer_phone, issued_date, status, mode, quantity_label, subtotal_kobo, discount_kobo, tax_kobo, total_kobo, amount_paid_kobo, balance_remaining_kobo, due_date, valid_until, terms, payment_method, public_token, visibility, customer_show_on_public, source_document_id, converted_to_document_id, receipt_for_payment_kobo",
    )
    .eq("id", id)
    .maybeSingle();

  if (!doc) notFound();

  const type = doc.document_type as DocType;

  const [{ data: items }, { data: business }, linkResult, receiptResult] = await Promise.all([
    supabase
      .from("document_items")
      .select("item_name, description, quantity, quantity_label, unit_price_kobo, total_kobo, position")
      .eq("document_id", id)
      .order("position"),
    supabase
      .from("businesses")
      .select("name, address, phone, email, logo_url, bank_name, bank_account_name, bank_account_number")
      .eq("owner_id", user!.id)
      .maybeSingle(),
    [doc.source_document_id, doc.converted_to_document_id].filter(Boolean).length
      ? supabase
          .from("documents")
          .select("id, document_type, document_number")
          .in(
            "id",
            [doc.source_document_id, doc.converted_to_document_id].filter(Boolean) as string[],
          )
      : Promise.resolve({ data: [] as LinkedDoc[] }),
    type === "invoice"
      ? supabase
          .from("documents")
          .select("id, document_number, issued_date, receipt_for_payment_kobo, payment_method")
          .eq("source_document_id", id)
          .order("created_at")
      : Promise.resolve({ data: [] as ReceiptRow[] }),
  ]);

  const linked = (linkResult.data ?? []) as LinkedDoc[];
  const receipts = (receiptResult.data ?? []) as ReceiptRow[];
  const source = linked.find((d) => d.id === doc.source_document_id) ?? null;
  const convertedTo = linked.find((d) => d.id === doc.converted_to_document_id) ?? null;

  const meta = typeMeta[type];
  const effStatus = effectiveStatus(doc);
  const publicUrl = `${site.url}/r/${doc.public_token}`;
  // Exact print sheet, pre-rendered hidden for the ShareSheet's in-page PDF capture.
  const printData = await loadPrintData(id);
  const thisPayment = doc.receipt_for_payment_kobo;
  // On a receipt, "paid in total" only adds information once there is more than one payment.
  const showTotalPaid =
    type !== "receipt" || (thisPayment !== null && doc.amount_paid_kobo > thisPayment);

  const waText = encodeURIComponent(
    [
      `${meta.label} ${doc.document_number} from ${business?.name ?? "us"}`,
      `Customer: ${doc.customer_name}`,
      `Total: ${formatKobo(doc.total_kobo)}`,
      type === "receipt" && doc.balance_remaining_kobo > 0
        ? `Balance remaining: ${formatKobo(doc.balance_remaining_kobo)}`
        : type === "invoice"
          ? `Outstanding: ${formatKobo(doc.balance_remaining_kobo)}`
          : "",
      "",
      `View and verify: ${publicUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const waCaption = decodeURIComponent(waText);

  const showConvert = type === "quotation" && doc.status !== "converted" && !doc.converted_to_document_id;
  const showPayment = type === "invoice" && doc.balance_remaining_kobo > 0;

  return (
    <div className="space-y-4">
      {created === "1" && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-[13.5px] font-medium text-[var(--success)]">
          <CheckIcon size={16} strokeWidth={3} />
          Saved. {doc.document_number} is ready to share.
        </div>
      )}
      {converted === "1" && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-[13.5px] font-medium text-[var(--success)]">
          <CheckIcon size={16} strokeWidth={3} />
          {source ? `${source.document_number} is now an invoice.` : "Invoice created."} Share{" "}
          {doc.document_number} with your customer.
        </div>
      )}
      {payment === "1" && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-[13.5px] font-medium text-[var(--success)]">
          <CheckIcon size={16} strokeWidth={3} />
          Payment recorded. {doc.document_number} is ready to send.
        </div>
      )}

      <div>
        <Link href="/documents" className="text-[12.5px] text-ink-3 hover:text-ink">
          ← All documents
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink">
              {meta.label}
            </h1>
            <p className="num mt-0.5 text-[12.5px] text-ink-3">{doc.document_number}</p>
          </div>
          <StatusBadge status={effStatus} />
        </div>
      </div>

      {/* Document preview */}
      <article className="overflow-hidden rounded-2xl border border-line bg-surface">
        <header className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="flex items-center gap-2.5">
            {business?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-[15px] font-medium text-cocoa dark:text-ink">
                {business?.name?.[0] ?? "R"}
              </span>
            )}
            <div>
              <p className="text-[14px] font-medium leading-tight text-ink">{business?.name}</p>
              <p className="text-[11.5px] leading-tight text-ink-3">{business?.address}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="eyebrow text-[9.5px]">{meta.label}</p>
            <p className="num mt-1 text-[10.5px] text-ink-3">{doc.document_number}</p>
          </div>
        </header>

        <div className="p-4">
          <div className="flex justify-between gap-4 text-[12.5px]">
            <div>
              <p className="text-ink-3">Billed to</p>
              <p className="mt-0.5 font-medium text-ink">{doc.customer_name}</p>
              {doc.customer_phone && <p className="num text-ink-3">{doc.customer_phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-ink-3">Issued</p>
              <p className="mt-0.5 text-ink">
                {new Date(doc.issued_date).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              {doc.due_date && (
                <p className="mt-1 text-[11.5px] text-ink-3">
                  Due{" "}
                  {new Date(doc.due_date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </p>
              )}
              {doc.valid_until && (
                <p className="mt-1 text-[11.5px] text-ink-3">
                  Valid until{" "}
                  {new Date(doc.valid_until).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-4 divide-y divide-line border-y border-line">
            {(items ?? []).map((item, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-ink">{item.item_name}</p>
                  {item.description && (
                    <p className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{item.description}</p>
                  )}
                  <p className="num mt-0.5 text-[11px] text-ink-3">
                    {Number(item.quantity)} × {formatKobo(item.unit_price_kobo)}
                  </p>
                </div>
                <p className="num shrink-0 text-[13px] text-ink">{formatKobo(item.total_kobo)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-1.5 text-[12.5px]">
            <div className="flex justify-between text-ink-2">
              <dt>Subtotal</dt>
              <dd className="num text-ink">{formatKobo(doc.subtotal_kobo)}</dd>
            </div>
            {doc.discount_kobo > 0 && (
              <div className="flex justify-between text-ink-2">
                <dt>Discount</dt>
                <dd className="num text-ink">−{formatKobo(doc.discount_kobo)}</dd>
              </div>
            )}
            {doc.tax_kobo > 0 && (
              <div className="flex justify-between text-ink-2">
                <dt>VAT</dt>
                <dd className="num text-ink">{formatKobo(doc.tax_kobo)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-2">
              <dt className="text-[13.5px] font-medium text-ink">Total</dt>
              <dd className="num text-[17px] font-medium text-ink">{formatKobo(doc.total_kobo)}</dd>
            </div>
            {type === "receipt" && thisPayment !== null && (
              <div className="flex justify-between text-ink-2">
                <dt>This payment</dt>
                <dd className="num text-ink">{formatKobo(thisPayment)}</dd>
              </div>
            )}
            {type !== "quotation" && (
              <div className="flex justify-between text-ink-2">
                <dt>{type === "receipt" && showTotalPaid ? "Paid in total" : "Paid"}</dt>
                <dd
                  className={
                    doc.amount_paid_kobo > 0
                      ? "num text-[var(--success)]"
                      : "num text-ink-3"
                  }
                >
                  {formatKobo(doc.amount_paid_kobo)}
                </dd>
              </div>
            )}
            {doc.balance_remaining_kobo > 0 && (
              <div className="flex justify-between text-ink-2">
                <dt>Balance</dt>
                <dd className="num font-medium text-[var(--warning)]">
                  {formatKobo(doc.balance_remaining_kobo)}
                </dd>
              </div>
            )}
            {type !== "quotation" &&
              doc.amount_paid_kobo > 0 &&
              doc.balance_remaining_kobo === 0 && (
                <p className="pt-1 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--success)]">
                  Paid in full
                </p>
              )}
          </dl>

          {type === "receipt" && doc.payment_method && doc.amount_paid_kobo > 0 && (
            <p className="mt-2.5 text-[11.5px] text-ink-3">
              Received via <span className="text-ink-2">{doc.payment_method}</span>
            </p>
          )}
          {type === "receipt" && doc.amount_paid_kobo === 0 && (
            <p className="mt-2.5 text-[11.5px] text-ink-3">No payment received yet.</p>
          )}

          {type === "invoice" && business?.bank_account_number && (
            <div className="mt-3 rounded-xl bg-surface-2 p-3 text-[11.5px] leading-relaxed text-ink-2">
              <p className="font-medium text-ink">Pay to</p>
              <p className="num mt-0.5">
                {business.bank_name} · {business.bank_account_number}
              </p>
              <p>{business.bank_account_name}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2">
              <ShieldCheckIcon size={13} className="text-[var(--success)]" />
              Verified with rela.
            </span>
            <span className="num truncate text-[10.5px] text-ink-3">
              {site.url.replace(/^https?:\/\//, "")}/r/{doc.public_token.slice(0, 6)}…
            </span>
          </div>
        </div>
      </article>

      {/* Where this document came from, and what it became */}
      {(source || convertedTo) && (
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <p className="eyebrow text-[9.5px]">Linked documents</p>
          <div className="mt-2 space-y-1.5">
            {source && (
              <Link
                href={`/documents/${source.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-[13px] text-ink hover:text-[var(--accent-text)]"
              >
                <span>
                  {type === "receipt" ? "Payment against" : "Converted from"}{" "}
                  <span className="num">{source.document_number}</span>
                </span>
                <span aria-hidden className="text-ink-3">
                  →
                </span>
              </Link>
            )}
            {convertedTo && (
              <Link
                href={`/documents/${convertedTo.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-[13px] text-ink hover:text-[var(--accent-text)]"
              >
                <span>
                  Converted to <span className="num">{convertedTo.document_number}</span>
                </span>
                <span aria-hidden className="text-ink-3">
                  →
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Payments received against an invoice */}
      {type === "invoice" && receipts.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-3.5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-[9.5px]">Payments received</p>
            <p className="num text-[11.5px] text-ink-3">{receipts.length}</p>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {receipts.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/documents/${r.id}`}
                  className="flex items-center justify-between gap-3 py-2 text-[13px] text-ink hover:text-[var(--accent-text)]"
                >
                  <span className="min-w-0">
                    <span className="num block truncate">{r.document_number}</span>
                    <span className="block text-[11.5px] text-ink-3">
                      {new Date(r.issued_date).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                      {r.payment_method ? ` · ${r.payment_method}` : ""}
                    </span>
                  </span>
                  <span className="num shrink-0 text-[13px]">
                    {formatKobo(r.receipt_for_payment_kobo ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {showConvert && <ConvertToInvoiceButton documentId={doc.id} />}
        {showPayment && (
          <RecordPaymentSheet
            documentId={doc.id}
            number={doc.document_number}
            balanceKobo={doc.balance_remaining_kobo}
            customerName={doc.customer_name}
          />
        )}
        <StatusButtons documentId={doc.id} type={type} status={effStatus} />

        <ShareSheet
          documentNumber={doc.document_number}
          label={meta.label}
          publicUrl={publicUrl}
          waCaption={waCaption}
          waFallbackHref={whatsappHref(doc.customer_phone, waText)}
          printUrl={`/documents/${doc.id}/print`}
        />
      </div>

      <p className="pb-4 text-center text-[11.5px] leading-relaxed text-ink-3">
        PDFs on the free plan carry a small rela. mark — Starter removes it.
      </p>

      {/* Hidden print-sheet clone: ShareSheet un-hides this, rasterises it to
          the WhatsApp PDF, and hides it again — no popup window needed. */}
      <div id="pdf-capture-root" className="hidden" aria-hidden="true">
        <PrintSheetView
          doc={printData.doc}
          items={printData.items}
          business={printData.business}
          publicUrl={publicUrl}
          watermark={printData.watermark}
        />
      </div>
    </div>
  );
}
