import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { formatKobo } from "@/lib/money";
import { typeMeta, type DocType } from "@/lib/documents/status";
import { CheckIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/ui/icons";
import { CopyLinkButton } from "@/components/documents/CopyLinkButton";
import { site } from "@/lib/site";

export const metadata = { title: "Document" };

export default async function DocumentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, document_type, document_number, customer_name, customer_phone, issued_date, status, mode, quantity_label, subtotal_kobo, discount_kobo, tax_kobo, total_kobo, amount_paid_kobo, balance_remaining_kobo, due_date, valid_until, terms, payment_method, public_token, visibility, customer_show_on_public",
    )
    .eq("id", id)
    .maybeSingle();

  if (!doc) notFound();

  const [{ data: items }, { data: business }] = await Promise.all([
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
  ]);

  const type = doc.document_type as DocType;
  const meta = typeMeta[type];
  const publicUrl = `${site.url}/r/${doc.public_token}`;

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

  return (
    <div className="space-y-4">
      {created === "1" && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-[13.5px] font-medium text-[var(--success)]">
          <CheckIcon size={16} strokeWidth={3} />
          Saved. {doc.document_number} is ready to share.
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
          <StatusBadge status={doc.status} />
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
            {doc.amount_paid_kobo > 0 && (
              <div className="flex justify-between text-ink-2">
                <dt>Paid</dt>
                <dd className="num text-[var(--success)]">{formatKobo(doc.amount_paid_kobo)}</dd>
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
          </dl>

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
            <span className="num truncate text-[10.5px] text-ink-3">{site.url.replace(/^https?:\/\//, "")}/r/{doc.public_token.slice(0, 6)}…</span>
          </div>
        </div>
      </article>

      {/* Actions */}
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={whatsappHref(doc.customer_phone, waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <WhatsAppIcon size={17} />
          Share on WhatsApp
        </a>
        <CopyLinkButton url={publicUrl} />
      </div>

      <Link href={`/r/${doc.public_token}`} className="btn btn-ghost btn-block">
        Open public verification page
      </Link>

      <p className="pb-4 text-center text-[11.5px] leading-relaxed text-ink-3">
        Conversions, PDF export and payment tracking arrive next. This document is already
        live at its verification link.
      </p>
    </div>
  );
}
