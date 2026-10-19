# Foreign-currency documents

## What this release does

- Receipts, invoices and quotations support **NGN, USD, GBP and EUR**.
- Settings → **Default currency** chooses the starting currency for new documents.
- Each new document can choose a different currency. This changes the denomination;
  it does **not** convert amounts or fetch an exchange rate.
- Settings → **Payment instructions** stores reusable text (up to 500 characters).
  It can be checked or changed on each new invoice or quotation.
- The document saves a snapshot of those instructions. Changing Settings later
  does not rewrite previously issued documents.
- Instructions appear under **How to pay** on outstanding invoices/quotations,
  their PDFs and public verification pages. Receipts do not request another payment.
- Nigerian bank details from setup appear only on outstanding **NGN** invoices.
  Foreign-currency documents use their own instructions instead, avoiding accidental
  payment into a naira-only account.
- Converting a quotation keeps its currency and instructions. Recording an invoice
  payment creates a receipt in the same currency.
- Dashboard and Analytics keep each currency separate. Repeated partial payments
  contribute only the amount of each payment, not the running paid-to-date total.

## What this release does not do

Rela does not open a payment account, move money, exchange currencies or automatically
confirm external payments. The business/freelancer supplies an account or payment
service they already use that accepts the billed currency. Availability, eligibility,
fees and settlement are determined by that provider and the user's location.

The customer pays that business directly. The business records the payment in Rela
once received. A public verification page verifies the document record, not the
underlying bank transfer.

**Foreign customers subscribing to Rela itself remains discussion-only.** This
release does not change Rela's existing NGN subscription price or payment processor.

## Database / implementation

Migrations `0005`, `0006` and `0007` are applied to the live project:

- `0005`: business defaults, document instruction snapshots, public projection.
- `0006`: invoices without an optional due date can still receive payments.
- `0007`: authenticated `create_document_in_currency` stores all fields atomically;
  conversions copy currency/instructions/delivery inside their transaction; source
  rows are locked while updating payment balances; document currencies are checked
  against the supported list. It also records the delivery-fee schema for fresh installs.

No best-effort follow-up currency PATCH is used. A failure rolls back the document,
items, number allocation and usage update together.

## Verification

`qa/currency.mjs` covers 43 checks: all four currency displays, settings persistence,
PDF generation, delivery/tax/discount, public pages, inert script-shaped instructions,
partial payments, separate dashboard/chart/customer totals, snapshot preservation,
invalid currencies, direct-receipt rules, anonymous denial and cross-tenant denial.

`qa/lifecycle.mjs` now creates its own fixtures and restores the QA plan/usage, rather
than relying on demo rows left behind by another suite.

To run against a dev server, export the service-role key locally (never in chat or
source control) and run `node qa/currency.mjs`. For the post-deploy smoke test set
`QA_BASE_URL=https://rela-iota-eight.vercel.app`. Only the dedicated QA business is
used; test-created documents are removed and prior defaults, plan and usage restored.
