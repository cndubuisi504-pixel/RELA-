import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKobo } from "@/lib/money";
import { typeMeta, effectiveStatus, type DocType } from "@/lib/documents/status";
import { StatusBadge } from "@/components/documents/StatusBadge";
import { Logo } from "@/components/branding/Logo";
import { ShieldCheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Verify a document · rela.",
  robots: { index: false, follow: false },
};

type PublicDoc = {
  type: DocType;
  number: string;
  issued_date: string;
  status: string;
  business: { name: string; logo_url: string | null; phone: string | null; email: string | null; address: string };
  customer_name: string | null;
  items: { name: string; description: string | null; quantity: number; unit_price_kobo: number; total_kobo: number }[];
  subtotal_kobo: number;
  discount_kobo: number;
  tax_kobo: number;
  delivery_kobo: number;
  total_kobo: number;
  amount_paid_kobo: number;
  balance_remaining_kobo: number;
  due_date: string | null;
  valid_until: string | null;
};

async function loadDocument(token: string): Promise<PublicDoc | null> {
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_document", { p_token: token });
  if (error || !data) return null;
  return data as PublicDoc;
}

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await loadDocument(token);

  if (!doc) {
    return (
      <main id="main" className="flex min-h-dvh flex-col bg-canvas">
        <header className="container-x flex h-16 items-center">
          <Logo href="/" markSize={22} textClassName="text-[20px]" />
        </header>
        <div className="container-x flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px] rounded-[1.75rem] border border-line bg-surface p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-bg)] text-[var(--warning)]">
              <ShieldCheckIcon size={22} />
            </div>
            <h1 className="mt-4 text-[20px] font-medium text-ink">This link isn&apos;t available</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
              The document may have been removed, made private, or the link may be incomplete.
              Ask the business that sent it to share it again.
            </p>
            <Link href="/" className="btn btn-ghost btn-block mt-5">
              Go to rela.
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const meta = typeMeta[doc.type];

  return (
    <main id="main" className="min-h-dvh bg-canvas pb-10">
      <header className="container-x flex h-16 items-center justify-between">
        <Logo href="/" markSize={22} textClassName="text-[20px]" />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--success)]">
          <ShieldCheckIcon size={13} />
          Verified with Rela
        </span>
      </header>

      <div className="container-x">
        <article className="mx-auto max-w-[520px] overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-[var(--shadow-1)]">
          <header className="flex items-start justify-between gap-3 border-b border-line p-5">
            <div className="flex items-center gap-3">
              {doc.business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.business.logo_url} alt={`${doc.business.name} logo`} className="h-11 w-11 rounded-lg object-contain" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-[16px] font-medium text-cocoa dark:text-ink">
                  {doc.business.name[0]}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium leading-tight text-ink">{doc.business.name}</p>
                <p className="num text-[11.5px] leading-tight text-ink-3">{doc.business.phone}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="eyebrow text-[9.5px]">{meta.label}</p>
              <p className="num mt-1 text-[10.5px] text-ink-3">{doc.number}</p>
            </div>
          </header>

          <div className="p-5">
            <div className="flex items-start justify-between gap-4 text-[12.5px]">
              <div>
                <p className="text-ink-3">{doc.customer_name ? "Customer" : "Issued to"}</p>
                <p className="mt-0.5 font-medium text-ink">
                  {doc.customer_name ?? "Customer name withheld"}
                </p>
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
              </div>
            </div>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {doc.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink">{item.name}</p>
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
              {doc.delivery_kobo > 0 && (
                <div className="flex justify-between text-ink-2">
                  <dt>Delivery</dt>
                  <dd className="num text-ink">{formatKobo(doc.delivery_kobo)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <dt className="text-[13.5px] font-medium text-ink">Total</dt>
                <dd className="num text-[18px] font-medium text-ink">{formatKobo(doc.total_kobo)}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
              <StatusBadge status={effectiveStatus({
                document_type: doc.type,
                status: doc.status,
                valid_until: doc.valid_until,
                due_date: doc.due_date,
                balance_remaining_kobo: doc.balance_remaining_kobo,
              })} />
              {doc.status === "paid" ? (
                <span className="num text-[12px] text-ink-3">
                  Paid {formatKobo(doc.amount_paid_kobo)}
                </span>
              ) : (
                <span className="num text-[12px] text-[var(--warning)]">
                  Balance {formatKobo(doc.balance_remaining_kobo)}
                </span>
              )}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              This page confirms the document was issued through Rela and hasn&apos;t been altered
              in our records. It isn&apos;t proof that money changed hands.
            </p>
          </div>
        </article>

        <p className="mx-auto mt-5 max-w-[420px] text-center text-[11.5px] leading-relaxed text-ink-3">
          Issued by {doc.business.name} using{" "}
          <Link href="/" className="font-medium text-[var(--accent-text)] hover:underline">
            Rela
          </Link>
          , the document tool for small businesses.
        </p>
      </div>
    </main>
  );
}
