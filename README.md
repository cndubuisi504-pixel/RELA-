# rela.

Business documents for businesses and freelancers — receipts, invoices and quotations,
created in seconds, shared on WhatsApp, and verified with a public link.

> **Now:** create receipts, invoices and quotations in **NGN, USD, GBP or EUR**;
> convert quotations, record invoice payments, and share verification links or
> save a PDF. Add your own **How to pay** instructions for external payments.
> See [`docs/INTERNATIONAL.md`](docs/INTERNATIONAL.md) for the scope and limitations.


## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4 with CSS-variable design tokens
- Satoshi (display/UI) + Inter (numerals), self-hosted
- Supabase (Postgres, Auth, RLS, Storage)
- Paystack subscriptions — test keys wired, live keys swap in Vercel

## Run locally

```bash
npm install
cp .env.example .env.local   # configure locally; never commit real credentials
npm run dev                  # http://localhost:3000
```

## Design system

Full token table, type scale, component map and the accessibility rules are in
[`docs/DESIGN.md`](docs/DESIGN.md).

## Design tokens

All colour, radius, shadow and type decisions live in `app/globals.css`.
Change `--primary`, `--canvas`, `--ink`, etc. once and the whole product follows.
Theme is set by `data-theme="light|dark"` on `<html>`; the preference is stored in
`localStorage` under `rela-theme` with a system fallback before the first choice.

## QA scripts

With the dev server running:

```bash
npm run qa        # contrast + landmarks + heading order + target sizes
node qa/shots.mjs # desktop/mobile screenshots in both themes (needs playwright)
```

## Build status

| Stage | Scope | Status |
| --- | --- | --- |
| 1 | Tokens, typography, landing page, API docs, support, legal drafts | Built |
| 2 | Supabase schema, RLS, storage, atomic numbering | Built |
| 3 | Auth (signup / login / reset / callback) | Built |
| 4 | Business setup flow (business → branding → preferences) | Built |
| 5 | App shell, dashboard, usage banner, filters, documents list | Built |
| 6 | `DocumentItemsEditor` + receipt/invoice/quotation creation | Built |
| 7 | Public verification `/r/[token]` + WhatsApp share | Built |
| 8 | Conversions: quotation → invoice → receipt, partial payments, status actions | Built |
| 8b | PDF export via print-ready A4 page | Built |
| 9 | Paystack checkout + verified webhooks + expiry downgrade | Built (test keys) |
| 10 | Analytics charts, admin dashboard, deployment | Built |
| 11 | NGN/USD/GBP/EUR documents, payment instructions, separate currency totals | Built |

### Money rules

- Amounts are integer minor units (kobo/cents/pence; 100 per currency unit); the database recomputes every total from the
  line items and never trusts client math.
- Direct receipts require full payment. Record partial payments against an invoice.
- Different currencies are never added together; switching a document currency does not perform FX.
- Converting a document does **not** use up the free monthly allowance (5 documents),
  because the vendor already spent it on the source document.
- Document numbers are allocated per business, per type, per day:
  `REC-20261017-0001`.
- A repeat payment tap within two minutes returns the receipt that already exists
  instead of recording the same money twice.

### Tested end to end

`node qa/flow.mjs` drives a real browser against the real Supabase project:
login (including the wrong-password path), input preservation after an error, business
validation, logo upload to storage, preferences, dashboard, document creation, number
format, anonymous public verification, and protected-route redirects. It currently
prints **all PASS** with no console errors.

`node qa/conversions.mjs`, `node qa/print.mjs` covers the chain: quotation → invoice → partial payment →
remaining balance, plus the linked-document cards, the paid-state transitions, and
that a double tap never charges twice. It prints **14/14 PASS**.
