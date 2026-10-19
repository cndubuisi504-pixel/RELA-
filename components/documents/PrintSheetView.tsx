import { typeMeta } from "@/lib/documents/status";
import { formatKobo, asCurrency } from "@/lib/money";
import { site } from "@/lib/site";

/**
 * The full A4 document sheet — shared by the print route AND the hidden
 * capture target embedded in the document page (ShareSheet builds the
 * WhatsApp PDF from an exact copy of this DOM).
 */
export type PrintSheetDoc = {
  document_type: string;
  document_number: string;
  customer_name: string;
  issued_date: string;
  [key: string]: unknown;
};

function d(date: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(date).toLocaleDateString("en-NG", opts);
}

/* Article body verbatim from the print route. */
export function PrintSheetView({
  doc,
  items,
  business,
  publicUrl,
  watermark,
}: {
  doc: any;
  items: any[];
  business: any;
  publicUrl: string;
  watermark: boolean;
}) {
  const meta = typeMeta[doc.document_type as keyof typeof typeMeta];
  const currency = asCurrency(doc.currency as string | null);
  const thisPayment = doc.receipt_for_payment_kobo;
  const showTotalPaid =
    doc.document_type !== "receipt" || (thisPayment !== null && doc.amount_paid_kobo > thisPayment);
  const hasBreakdown = doc.discount_kobo > 0 || doc.tax_kobo > 0;
  const showBank =
    doc.document_type === "invoice" &&
    currency === "NGN" &&
    doc.balance_remaining_kobo > 0 &&
    (business?.bank_name || business?.bank_account_number);
  const showInstructions =
    (doc.document_type === "invoice" || doc.document_type === "quotation") &&
    doc.balance_remaining_kobo > 0 &&
    !!doc.payment_instructions;

  const totals: [string, string][] = [];
  if (hasBreakdown) totals.push(["Subtotal", formatKobo(doc.subtotal_kobo, currency)]);
  if (doc.discount_kobo > 0) totals.push(["Discount", `− ${formatKobo(doc.discount_kobo, currency)}`]);
  if (doc.tax_kobo > 0) totals.push(["Tax", `+ ${formatKobo(doc.tax_kobo, currency)}`]);
  if (doc.delivery_kobo > 0) totals.push(["Delivery", `+ ${formatKobo(doc.delivery_kobo, currency)}`]);

  return (
  <article className="print-sheet" aria-label={`${meta.label} ${doc.document_number}`}>
          {watermark && (
            <div className="print-watermark" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i}>rela.</span>
              ))}
            </div>
          )}

          {/* ---------------------------------------------------- header */}
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              {business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logo_url}
                  alt=""
                  className="h-14 w-14 rounded-xl object-contain"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#f4efe6] text-[20px] font-semibold text-[#453027]">
                  {business.name[0]}
                </span>
              )}
              <div>
                <p className="text-[19px] font-semibold leading-tight">{business.name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[#6b625c]">{business.address}</p>
                <p className="num text-[12px] leading-snug text-[#6b625c]">
                  {[business.phone, business.email].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[24px] font-semibold uppercase tracking-[0.08em] text-[#ff6d29]">
                {meta.label}
              </p>
              <p className="num mt-1 text-[12.5px] text-[#6b625c]">{doc.document_number}</p>
              <p className="mt-0.5 text-[12.5px] text-[#6b625c]">Issued {d(doc.issued_date)}</p>
              {doc.due_date && (
                <p className="mt-0.5 text-[12.5px] font-medium">Due {d(doc.due_date)}</p>
              )}
              {doc.valid_until && (
                <p className="mt-0.5 text-[12.5px] font-medium">
                  Valid until {d(doc.valid_until)}
                </p>
              )}
            </div>
          </header>

          {/* ---------------------------------------------------- billed to */}
          <div className="mt-8 border-y border-[#e6dfd4] py-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
              {doc.document_type === "receipt" ? "Received from" : "Billed to"}
            </p>
            <p className="mt-1 text-[16px] font-semibold">{doc.customer_name}</p>
            {doc.customer_phone && (
              <p className="num mt-0.5 text-[12.5px] text-[#6b625c]">{doc.customer_phone}</p>
            )}
          </div>

          {/* ---------------------------------------------------- items */}
          <table className="mt-6 w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b-2 border-[#1a1512] text-left">
                <th className="pb-2 pr-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  Item
                </th>
                <th className="num w-16 pb-2 pr-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  {doc.quantity_label}
                </th>
                <th className="num w-24 pb-2 pr-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  Price
                </th>
                <th className="num w-24 pb-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="print-break-avoid border-b border-[#e6dfd4]">
                  <td className="py-3 pr-3 align-top">
                    <p className="font-medium">{item.item_name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-[11.5px] leading-snug text-[#6b625c]">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="num py-3 pr-3 text-right align-top text-[#6b625c]">
                    {Number(item.quantity)}
                  </td>
                  <td className="num py-3 pr-3 text-right align-top text-[#6b625c]">
                    {formatKobo(item.unit_price_kobo, currency)}
                  </td>
                  <td className="num py-3 text-right align-top font-medium">
                    {formatKobo(item.total_kobo, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ---------------------------------------------------- totals */}
          <div className="print-break-avoid mt-6 flex justify-end">
            <dl className="w-full max-w-[280px] space-y-1.5 text-[13.5px]">
              {totals.map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-[#6b625c]">{label}</dt>
                  <dd className="num">{value}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t-2 border-[#1a1512] pt-2.5">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.12em]">Total</dt>
                <dd className="num text-[22px] font-semibold">{formatKobo(doc.total_kobo, currency)}</dd>
              </div>
              {thisPayment !== null && (
                <div className="flex justify-between">
                  <dt className="text-[#6b625c]">This payment</dt>
                  <dd className="num">{formatKobo(thisPayment, currency)}</dd>
                </div>
              )}
              {doc.document_type !== "quotation" && (
                <div className="flex justify-between">
                  <dt className="text-[#6b625c]">
                    {doc.document_type === "receipt" && showTotalPaid ? "Amount paid in total" : "Amount paid"}
                  </dt>
                  <dd className="num">{formatKobo(doc.amount_paid_kobo, currency)}</dd>
                </div>
              )}
              {doc.balance_remaining_kobo > 0 ? (
                <div className="flex justify-between font-semibold text-[#b54f1d]">
                  <dt>Balance owed</dt>
                  <dd className="num">{formatKobo(doc.balance_remaining_kobo, currency)}</dd>
                </div>
              ) : doc.document_type !== "quotation" ? (
                <p className="pt-1 text-right text-[12px] font-semibold uppercase tracking-[0.12em] text-[#1e7c3f]">
                  Paid in full
                </p>
              ) : null}
              {doc.document_type === "receipt" &&
                doc.payment_method &&
                doc.amount_paid_kobo > 0 && (
                  <p className="pt-0.5 text-right text-[12px] text-[#6b625c]">
                    Received via {doc.payment_method}
                  </p>
                )}
            </dl>
          </div>

          {/* ---------------------------------------------------- bank + terms */}
          <div className="print-break-avoid mt-8 grid gap-6 border-t border-[#e6dfd4] pt-5 text-[12px] leading-relaxed text-[#4d4641] sm:grid-cols-2">
            {showBank && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  Pay by bank transfer
                </p>
                <p className="mt-1.5 font-semibold text-[#1a1512]">{business.bank_name}</p>
                <p className="num">{business.bank_account_number}</p>
                <p>{business.bank_account_name}</p>
              </div>
            )}
            {showInstructions && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  How to pay
                </p>
                <p className="mt-1.5 whitespace-pre-line [overflow-wrap:anywhere]">{doc.payment_instructions}</p>
              </div>
            )}
            {doc.terms && (
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6b625c]">
                  Terms
                </p>
                <p className="mt-1.5 whitespace-pre-line">{doc.terms}</p>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- footer */}
          <footer className="mt-10 border-t-2 border-[#1a1512] pt-3">
            <p className="text-[11px] leading-relaxed text-[#6b625c]">
              Verify this {meta.label.toLowerCase()} online:{" "}
              <span className="num text-[#1a1512]">{publicUrl}</span>
            </p>
            {watermark && (
              <p className="mt-1 text-[11px] font-medium text-[#ff6d29]">
                Made with rela. — receipts, invoices &amp; quotations in seconds. Create yours free
                at {site.url.replace(/^https?:\/\//, "")}
              </p>
            )}
          </footer>
        </article>
  );
}
