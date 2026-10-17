# rela.

Business documents for Nigerian small businesses — receipts, invoices and quotations,
created in seconds, shared on WhatsApp, and verified with a public link.

> **Stage 1 (current):** design foundation + public landing page.
> Auth, setup and the document app land in the next stages. See "Build status" below.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4 with CSS-variable design tokens
- Satoshi (display/UI) + Inter (numerals), self-hosted
- Supabase (Postgres, Auth, RLS, Storage) — next stage
- Flutterwave subscriptions — once the merchant account is live

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in when the backend pieces land
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
| 2 | Auth (signup / login / reset) | Next |
| 3 | Business setup flow, Supabase schema + RLS | Planned |
| 4 | App shell + dashboard | Planned |
| 5 | Document editor, receipts, invoices, quotations | Planned |
| 6 | Conversions, previews, exports, public verification | Planned |
| 7 | Flutterwave checkout + verified webhooks | After merchant account |
| 8 | Analytics, admin dashboard, deployment | Planned |
