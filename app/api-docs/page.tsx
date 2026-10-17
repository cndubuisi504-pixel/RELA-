import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "API Docs",
  description:
    "The Rela API is in private preview. Create receipts, invoices and quotations programmatically.",
};

const endpoints = [
  { method: "POST", path: "/api/documents", purpose: "Create a receipt, invoice or quotation" },
  { method: "GET", path: "/api/documents", purpose: "List documents with filters" },
  { method: "GET", path: "/api/documents/:id", purpose: "Fetch a single document" },
  { method: "POST", path: "/api/documents/:id/convert", purpose: "Convert quotation → invoice or invoice → receipt" },
  { method: "GET", path: "/api/public/documents/:token", purpose: "Read a public verification page" },
];

const curl = `curl https://rela.ng/api/v1/documents \\
  -H "Authorization: Bearer $RELA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "invoice",
    "customer": { "name": "Chinedu Okafor", "phone": "+2348012345678" },
    "mode": "service",
    "items": [
      { "name": "Website design", "description": "E-commerce, 3 revisions",
        "unit_price_kobo": 35000000 }
    ],
    "due_date": "2026-11-14"
  }'`;

const response = `{
  "id": "doc_8f3k2m",
  "number": "INV-20261017-0001",
  "type": "invoice",
  "status": "draft",
  "total_kobo": 35000000,
  "public_url": "https://rela.ng/r/7k2m4x"
}`;

export default function ApiDocsPage() {
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent("Rela API access")}&body=${encodeURIComponent(
    "Hi Rela team,\n\nI'd like API access.\n\nWhat I'm building:\nMonthly volume:\nPreferred environment:",
  )}`;

  return (
    <>
      <Header />
      <main id="main" className="pt-28 md:pt-36">
        <section className="container-x">
          <div className="max-w-[720px]">
            <p className="eyebrow">Developers</p>
            <h1 className="h-display mt-5 text-ink">Build Rela into your back office.</h1>
            <p className="lede mt-5 max-w-[56ch]">
              The Rela API lets your own systems issue receipts, invoices and quotations with the
              same numbering, branding and verification that the app uses.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={mailto} className="btn btn-primary btn-lg">
                Request API access
                <ArrowRightIcon size={17} />
              </a>
              <a
                href={`https://wa.me/2349153230482`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-lg"
              >
                Ask on WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--warning-bg)] bg-[var(--warning-bg)] px-4 py-2 text-[13px] text-[var(--warning)]">
            <ShieldCheckIcon size={15} />
            Private preview. Access is negotiated — there is no public price.
          </div>
        </section>

        <section className="container-x mt-16 md:mt-20">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Issue documents",
                body: "Create a receipt, invoice or quotation with vendor-scoped numbering generated on our side.",
              },
              {
                title: "Convert in the chain",
                body: "Turn a quotation into an invoice, then an invoice into a receipt without retyping a single line item.",
              },
              {
                title: "Verify publicly",
                body: "Every response includes a public token URL your customer can open without an account.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-[22px] border border-line bg-surface p-6">
                <h2 className="text-[17px] font-medium text-ink">{c.title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-x mt-16 md:mt-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="min-w-0">
              <h2 className="text-[22px] font-medium tracking-tight text-ink">Create a document</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                Amounts are integers in kobo — ₦1,000.00 is <span className="num">100000</span>.
                Numbers are generated per business, per document type, per day.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-2xl bg-[var(--invert-bg)] p-5 text-[12.5px] leading-relaxed text-[var(--invert-text)]">
                <code>{curl}</code>
              </pre>
            </div>
            <div className="min-w-0">
              <h2 className="text-[22px] font-medium tracking-tight text-ink">What comes back</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                The public URL is safe to forward. Internal notes and identifiers are never
                exposed there.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface p-5 text-[12.5px] leading-relaxed text-ink">
                <code>{response}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="container-x mt-16 md:mt-20">
          <h2 className="text-[22px] font-medium tracking-tight text-ink">Endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-[0.12em] text-ink-3">
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Path</th>
                  <th className="px-5 py-3 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e) => (
                  <tr key={e.path + e.method} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-[var(--primary-soft)] px-2 py-1 text-[11.5px] font-semibold text-[var(--accent-text)]">
                        {e.method}
                      </span>
                    </td>
                    <td className="num px-5 py-3 text-ink">{e.path}</td>
                    <td className="px-5 py-3 text-ink-2">{e.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            This is the proposed contract for the private preview and may change before general
            availability.
          </p>
        </section>

        <section className="container-x py-16 md:py-24">
          <div className="rounded-[2rem] border border-line bg-surface-2 p-7 sm:p-10">
            <h2 className="h-section text-ink">What access includes</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Sandbox and production keys",
                "Webhooks for payment and conversion events",
                "Rate limits sized to your volume",
                "A direct channel to the engineers building it",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14.5px] text-ink-2">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[var(--primary-ink)]">
                    <CheckIcon size={11} strokeWidth={2.6} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <a href={mailto} className="btn btn-primary mt-8">
              For Devs — API Access
              <ArrowRightIcon size={16} />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
