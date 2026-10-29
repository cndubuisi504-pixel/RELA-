import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Storefront Receipt API Documentation · Rela",
  description:
    "Official API documentation for approved storefronts to issue receipts, download PDFs, and verify customer payments.",
};

const sampleRequest = `{
  "business": {
    "name": "Adaeze Fashion",
    "address": "Ikeja, Lagos",
    "phone": "08012345678"
  },
  "customer": {
    "name": "Ada Okafor",
    "email": "ada@example.com",
    "phone": "2348012345678"
  },
  "order_number": "ORD-1001",
  "items": [
    {
      "name": "Ankara Dress",
      "description": "Blue Ankara dress",
      "size": "M",
      "colour": "Blue",
      "quantity": 1,
      "unit_price": 45000
    }
  ],
  "charges": [
    {
      "name": "Delivery to Yaba",
      "amount": 3000
    }
  ],
  "discount": 0,
  "tax": 0,
  "currency": "NGN",
  "payment_method": "bank_transfer",
  "payment_reference": "PAY-123456",
  "payment_status": "paid",
  "purchase_date": "2026-10-23T14:30:00Z"
}`;

const sampleResponse = `{
  "success": true,
  "receipt": {
    "id": "rec_a14081a657074f3aee674ff8",
    "number": "REC-20261023-0001",
    "status": "paid",
    "total": 48000,
    "currency": "NGN",
    "verification_url": "https://rela-ng.vercel.app/r/249458b6c15fc64e59691ba0b594ec6f",
    "pdf_download_url": "https://rela-ng.vercel.app/v1/receipts/rec_a14081a657074f3aee674ff8/download?token=1d86078d101ed94f08b7345140bec1f52f024d96"
  }
}`;

const fieldsReference = [
  { field: "business", type: "object", required: "Required", description: "Storefront business metadata." },
  { field: "business.name", type: "string", required: "Required", description: "Business trading name displayed on header." },
  { field: "business.address", type: "string", required: "Optional", description: "Physical store or fulfillment location." },
  { field: "business.phone", type: "string", required: "Optional", description: "Customer care or WhatsApp support number." },
  { field: "business.email", type: "string", required: "Optional", description: "Contact email." },
  { field: "customer", type: "object", required: "Required", description: "Customer recipient metadata." },
  { field: "customer.name", type: "string", required: "Required", description: "Customer full name." },
  { field: "customer.email", type: "string", required: "Optional", description: "Customer email address." },
  { field: "customer.phone", type: "string", required: "Optional", description: "Customer phone number." },
  { field: "order_number", type: "string", required: "Optional", description: "Storefront order or cart reference (e.g. ORD-1001)." },
  { field: "items", type: "array", required: "Required", description: "Array of purchased goods or services (min 1 item)." },
  { field: "items[].name", type: "string", required: "Required", description: "Item title or merchandise name." },
  { field: "items[].description", type: "string", required: "Optional", description: "Item description." },
  { field: "items[].quantity", type: "number", required: "Required", description: "Item quantity (> 0)." },
  { field: "items[].unit_price", type: "number", required: "Required", description: "Price per unit in standard major units (>= 0)." },
  { field: "items[].size", type: "string", required: "Optional", description: "Merchandise size (e.g. S, M, L, XL, 42)." },
  { field: "items[].colour", type: "string", required: "Optional", description: "Merchandise colour or shade (also accepts `color`)." },
  { field: "charges", type: "array", required: "Optional", description: "Additional fees (delivery charges, logistics, packaging)." },
  { field: "charges[].name", type: "string", required: "Required*", description: "Charge label (e.g. 'Delivery to Yaba')." },
  { field: "charges[].amount", type: "number", required: "Required*", description: "Charge amount in major currency units (>= 0)." },
  { field: "discount", type: "number", required: "Optional", description: "Total discount applied to the purchase (>= 0, default 0)." },
  { field: "tax", type: "number", required: "Optional", description: "Applicable sales tax or VAT (>= 0, default 0)." },
  { field: "currency", type: "string", required: "Optional", description: "Currency code (default 'NGN'). Supports NGN, USD, GBP, EUR." },
  { field: "total_amount", type: "number", required: "Optional", description: "Total amount. Checked against sum(items) + charges - discount + tax." },
  { field: "payment_method", type: "string", required: "Optional", description: "e.g. 'bank_transfer', 'card', 'pos', 'cash'." },
  { field: "payment_reference", type: "string", required: "Optional", description: "Paystack/bank transaction reference (e.g. PAY-123456)." },
  { field: "payment_status", type: "string", required: "Optional", description: "Payment status, defaults to 'paid'." },
  { field: "purchase_date", type: "string (ISO)", required: "Optional", description: "Order completion timestamp (e.g. '2026-10-23T14:30:00Z')." },
];

const errorResponses = [
  {
    code: "401 Unauthorized",
    reason: "Invalid API key or missing authorization header.",
    example: `{ "success": false, "error": "unauthorized", "message": "Missing API key. Provide Authorization: Bearer <API_KEY> header." }`,
  },
  {
    code: "403 Forbidden",
    reason: "API key does not have permission to access the requested resource.",
    example: `{ "success": false, "error": "forbidden", "message": "You do not have permission to access this receipt." }`,
  },
  {
    code: "404 Not Found",
    reason: "Receipt ID does not exist.",
    example: `{ "success": false, "error": "not_found", "message": "Receipt rec_123456 not found." }`,
  },
  {
    code: "422 Unprocessable Entity",
    reason: "Missing required fields or invalid amounts (negative values, mismatch).",
    example: `{ "success": false, "error": "missing_fields", "message": "Missing required field(s): customer.name", "fields": ["customer.name"] }`,
  },
  {
    code: "429 Too Many Requests",
    reason: "Rate limit exceeded for the API key (default 120 req/min).",
    example: `{ "success": false, "error": "rate_limit_exceeded", "message": "Rate limit exceeded. Please wait before retrying.", "retry_after": 60 }`,
  },
  {
    code: "500 Internal Error",
    reason: "PDF rendering or persistence failure.",
    example: `{ "success": false, "error": "pdf_generation_failed", "message": "Failed to generate receipt PDF." }`,
  },
];

export default function ApiDocsPage() {
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent("Rela Storefront API Access")}&body=${encodeURIComponent(
    "Hi Rela team,\n\nI want to connect our storefront to Rela.\n\nStorefront name:\nWebsite:\nExpected volume:",
  )}`;

  return (
    <>
      <Header />
      <main id="main" className="pt-28 md:pt-36 pb-24">
        {/* Hero Header */}
        <section className="container-x">
          <div className="max-w-[760px]">
            <p className="eyebrow">Storefront API Reference</p>
            <h1 className="h-display mt-5 text-ink">Automated Receipts & PDF Generation.</h1>
            <p className="lede mt-5 max-w-[62ch]">
              Connect your e-commerce storefront (Shopify, WooCommerce, custom web checkout) to Rela.
              Issue certified payment receipts, generate branded PDFs on demand, and provide instant download links for your customers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={mailto} className="btn btn-primary btn-lg">
                Request Storefront API Key
                <ArrowRightIcon size={17} />
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-lg"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-2 text-[13px] font-medium text-[var(--success)]">
            <ShieldCheckIcon size={16} />
            REST API v1 Active · Cryptographically Signed Receipts · Zero-Chromium PDF Engine
          </div>
        </section>

        {/* 1. Authentication */}
        <section className="container-x mt-16 md:mt-24">
          <div className="rounded-[1.75rem] border border-line bg-surface p-7 sm:p-10">
            <h2 className="text-[22px] font-semibold text-ink">1. Authentication</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              All write requests to the Rela API require an authorized API key passed via the standard HTTP{" "}
              <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px] text-ink">Authorization</code> header:
            </p>

            <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-4 text-[13px] text-[var(--invert-text)]">
              <code>{`Authorization: Bearer rela_live_your_secret_api_key_here`}</code>
            </pre>

            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4 text-[13px] text-ink-2">
              <strong className="text-ink">Security Rule:</strong> Keep your secret API key strictly on your backend server.
              Never expose Rela API keys in client-side browser JavaScript, frontend HTML, or public GitHub repositories.
            </div>
          </div>
        </section>

        {/* 2. Create Receipt */}
        <section className="container-x mt-12 md:mt-16">
          <div className="rounded-[1.75rem] border border-line bg-surface p-7 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-md bg-[var(--primary-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent-text)]">
                  POST
                </span>
                <span className="num ml-3 text-[18px] font-medium text-ink">/v1/receipts</span>
              </div>
              <span className="text-[12.5px] text-ink-3">Content-Type: application/json</span>
            </div>

            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
              Sends completed order and payment details to Rela. Rela saves the receipt, issues an official daily sequence number,
              generates the PDF document, and returns a verified URL and download URL.
            </p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-[14px] font-semibold uppercase tracking-wider text-ink-3">Example Request</h3>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-4 text-[12px] leading-relaxed text-[var(--invert-text)]">
                  <code>{`curl -X POST https://rela-ng.vercel.app/v1/receipts \\
  -H "Authorization: Bearer $RELA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${sampleRequest}'`}</code>
                </pre>
              </div>

              <div>
                <h3 className="text-[14px] font-semibold uppercase tracking-wider text-ink-3">Response (201 Created)</h3>
                <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-4 text-[12px] leading-relaxed text-ink">
                  <code>{sampleResponse}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Accepted Fields */}
        <section className="container-x mt-12 md:mt-16">
          <h2 className="text-[22px] font-semibold text-ink">3. Accepted Request Fields</h2>
          <p className="mt-1 text-[14px] text-ink-2">Complete schema reference for <code className="text-ink">POST /v1/receipts</code>.</p>

          <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-line bg-surface">
            <table className="w-full min-w-[700px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                  <th className="px-5 py-3">Field</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Requirement</th>
                  <th className="px-5 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fieldsReference.map((f) => (
                  <tr key={f.field} className="hover:bg-surface-2/40">
                    <td className="num px-5 py-2.5 font-medium text-ink">{f.field}</td>
                    <td className="num px-5 py-2.5 text-ink-3 text-[12.5px]">{f.type}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          f.required.startsWith("Required")
                            ? "bg-[var(--primary-soft)] text-[var(--accent-text)]"
                            : "bg-surface-2 text-ink-3"
                        }`}
                      >
                        {f.required}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-ink-2 text-[13px]">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Download PDF */}
        <section className="container-x mt-12 md:mt-16">
          <div className="rounded-[1.75rem] border border-line bg-surface p-7 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-md bg-[var(--primary-soft)] px-2.5 py-1 text-[12px] font-bold text-[var(--accent-text)]">
                  GET
                </span>
                <span className="num ml-3 text-[18px] font-medium text-ink">/v1/receipts/:receipt_id/download</span>
              </div>
              <span className="text-[12.5px] text-ink-3">Response: application/pdf</span>
            </div>

            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
              Returns the official receipt as a PDF download with clean vector typography, order metadata, item breakdown, and an embedded verification QR code.
            </p>

            <div className="mt-6 space-y-4 text-[13.5px] text-ink-2">
              <h3 className="text-[15px] font-semibold text-ink">Response Headers</h3>
              <pre className="overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-4 text-[12.5px] text-[var(--invert-text)]">
                <code>{`Content-Type: application/pdf
Content-Disposition: attachment; filename="receipt-REC-20261023-0001.pdf"
Content-Length: 4093`}</code>
              </pre>

              <h3 className="pt-2 text-[15px] font-semibold text-ink">Placing the &ldquo;Download Receipt&rdquo; Button on Your Storefront</h3>
              <p>Storefronts have two recommended patterns to offer receipt downloads to customers without exposing secret API keys:</p>

              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div className="rounded-xl border border-line bg-surface-2 p-5">
                  <h4 className="font-medium text-ink">Pattern A: Direct Capability URL (Easiest)</h4>
                  <p className="mt-1 text-[12.5px] text-ink-3 leading-relaxed">
                    The <code className="text-ink">pdf_download_url</code> returned at creation includes a cryptographically signed capability token:
                  </p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--invert-bg)] p-3 text-[11px] text-[var(--invert-text)]">
                    <code>{`<a href={receipt.pdf_download_url} download>
  Download receipt
</a>`}</code>
                  </pre>
                  <p className="mt-2 text-[12px] text-ink-3">
                    Safe to place in the user&apos;s browser — no API key is exposed.
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-surface-2 p-5">
                  <h4 className="font-medium text-ink">Pattern B: Backend Proxy (Max Privacy)</h4>
                  <p className="mt-1 text-[12.5px] text-ink-3 leading-relaxed">
                    Your storefront server endpoints verify the user&apos;s session, fetch the PDF using your secret key, and pipe the response:
                  </p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--invert-bg)] p-3 text-[11px] text-[var(--invert-text)]">
                    <code>{`// Server-side Route Handler
const res = await fetch(\`https://rela-ng.vercel.app/v1/receipts/\${id}/download\`, {
  headers: { Authorization: \`Bearer \${process.env.RELA_API_KEY}\` }
});
return new Response(await res.blob(), { headers: res.headers });`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Public Verification */}
        <section className="container-x mt-12 md:mt-16">
          <div className="rounded-[1.75rem] border border-line bg-surface p-7 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
                <ShieldCheckIcon size={20} />
              </span>
              <h2 className="text-[22px] font-semibold text-ink">5. Public Receipt Verification</h2>
            </div>

            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-2">
              Every created receipt automatically receives a permanent public verification link (<code className="text-ink">verification_url</code>) hosted on Rela:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-3.5 text-[12.5px] text-[var(--invert-text)]">
              <code>https://rela-ng.vercel.app/r/249458b6c15fc64e59691ba0b594ec6f</code>
            </pre>
            <ul className="mt-4 space-y-2 text-[13.5px] text-ink-2">
              <li className="flex items-center gap-2">
                <CheckIcon size={14} className="text-[var(--success)]" />
                Customer, merchant, or delivery courier can open the page on any device without an account.
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon size={14} className="text-[var(--success)]" />
                Proves the receipt was officially generated and has not been altered or forged.
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon size={14} className="text-[var(--success)]" />
                Includes a live &ldquo;Download official PDF receipt&rdquo; button directly on the verification view.
              </li>
            </ul>
          </div>
        </section>

        {/* 6. Error Responses */}
        <section className="container-x mt-12 md:mt-16">
          <h2 className="text-[22px] font-semibold text-ink">6. Error Handling & HTTP Statuses</h2>
          <p className="mt-1 text-[14px] text-ink-2">All API errors return consistent JSON objects with descriptive error codes and messages.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {errorResponses.map((err) => (
              <div key={err.code} className="rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="num font-semibold text-ink text-[14px]">{err.code}</span>
                  <span className="text-[12px] text-ink-3">{err.reason}</span>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--invert-bg)] p-3 text-[11.5px] leading-relaxed text-[var(--invert-text)]">
                  <code>{err.example}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
