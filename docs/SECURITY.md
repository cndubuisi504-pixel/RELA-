# rela — security review (post-batch, 2026-10-19)

Method: static review (sinks, secrets, headers config) + runtime probes against the dev
server + the live QA suite (RLS/cross-tenant 6/6, Paystack webhook 8/8, admin gate probe).

## Verdicts

| Area | Result | Notes |
|---|---|---|
| Injection sinks (XSS) | CLEAN | No `dangerouslySetInnerHTML`, no `eval`/`new Function`. Only one `innerHTML` (ShareSheet veil) with a fully static string. All user content (business name, customer names, item text) flows through React escaping or SQL parameterised RPC calls. |
| PostgREST/RPC params | CLEAN | Every RPC call uses named JSON parameters; no string-built SQL anywhere. |
| Service-role key handling | CLEAN | `SUPABASE_SERVICE_ROLE_KEY` appears only in server modules/providers and the webhook route; no `"use client"` file imports it; never shipped via `NEXT_PUBLIC_`. |
| Response headers | GREEN | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=() microphone=() geolocation=()`, `COOP: same-origin-allow-popups`. Inline `poweredBy` off. |
| Content-Security-Policy | BACKLOG (accepted) | Inline theme bootstrap + html2canvas/html2pdf workers make strict CSP a rollout project, not a flag. Tracked, accepted at current risk profile. |
| Auth gates | GREEN | Anon hits on `/dashboard`, `/settings`, `/admin`, `/documents/:id/print` → 307 → `/login?next=…` (runtime probed). Setup-gate bounces app pages to `/setup` when business missing. |
| Row-level security | GREEN (suite-verified) | Every table has owner-only policies: `businesses_*_own`, `documents_*_own` (via `current_business_id()`), `profiles_select/update_own`. qa/cross-tenant.mjs proves 404-on-foreign-id for two seeded businesses. |
| Public verification links | GREEN | `public_document(token)` exposes only non-void docs with `visibility='link'`, redacts the customer unless `customer_show_on_public`, and (new) unknown/bad tokens now return 404 instead of a blank 200. |
| Money math integrity | GREEN | Totals are computed in `create_document` (plpgsql, integer kobo); client math never trusted. `paid_exceeds_total` raises; delivery fee added to the `total = subtotal − discount + tax + delivery` CHECK on both sides (function + table constraint); delivery negative → rejected (P0007 + CHECK). |
| Webhook (Paystack) | GREEN | HMAC signature mandatory; bad signature → 401 (probed); reference verified server-side against Paystack; missing/unknown reference rejected; replay idempotent (qa/paystack.mjs 8/8, live ₦2,500 charge). |
| Admin surface | GREEN | `/admin` requires admin email match; abuse probes 404 (suite). |
| New settings actions | CLEAN | `saveBusinessSettings`/`saveLogin` both call `requireUser()`, validate (name/address/NG-phone/email format/10-digit NUBAN + completeness of bank triple), update only the caller's row (RLS), and revalidate. Password/email changes go through Supabase `updateUser` (email needs an inbox confirmation; password instantly revoked elsewhere per Supabase policy). |
| Rate limiting | PARTIAL (known) | Auth flows rate-limited at GoTrue; Supabase REST enforces RLS. App routes (document create) are usage-quota'd rather than throttled — acceptable now; add an edge limiter if abuse appears. |

## Changes in this pass
- `app/r/[token]`: `return null` blank-page behaviour for unknown/revoked tokens → `notFound()` (proper 404).

## Open items (non-blocking)
- CSP rollout (report-only first) — needs asset audit of the capture/print pipeline.
- Application-layer rate limiting for document write routes if automated abuse emerges.
- Business-name misuse guard — three-layer design (hard-block list / warn-confirm / admin flag) agreed in principle; **owner deferred it (2026-10-19)** — revisit after more users sign up.

---

## Sweep — 2026-10-19 (pre-redesign-sign-off)

Re-run against production after the receipt-rule + share-sheet release.
All green:

| Area | Result |
| --- | --- |
| HTTP headers | HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, camera/mic/geo off |
| Auth gates | `/dashboard`, `/documents*`, `/analytics`, `/settings` all 307 → login when signed out |
| Public verify pages | bogus tokens 404; no business data in the body |
| Webhook | unsigned/fake Paystack payloads rejected (`bad signature`) |
| Stored XSS | `<script>alert(1)</script>` as an item name renders as inert text; zero dialogs fired in a real browser |
| RLS | anon key reads `[]` from every private table |
| Secrets | only `.env.example` (placeholders) tracked; service key never referenced in client components |
| DB integrity | `documents_direct_receipt_fully_paid` now enforced — partially-paid direct receipts are rejected at the database layer, not just the UI |

Standing advisories (unchanged): no app-level rate limiting (platform DDoS
protection only); CSP still report-only-candidate; business-name misuse guard
deferred by owner decision.


## Foreign-currency release — 2026-10-19

- New document RPC is authenticated-only and derives the business from `auth.uid()`;
  a second tenant cannot record a payment on another business's invoice.
- Currency and payment instructions are saved inside the creation transaction;
  conversions copy source currency inside their transaction. There is no silent
  follow-up PATCH that could leave a document incorrectly denominated.
- Payment updates lock the source invoice row. Supported currencies are validated
  by the RPC and a database constraint.
- Script-shaped payment instructions render as inert text on owner, PDF and public
  pages. The public RPC remains a whitelisted projection; defaults stay in the
  RLS-protected business table.
- No account provisioning, payment collection, FX or automatic external-payment
  confirmation is introduced. Account availability/fees remain with the provider.

Verification details: `docs/QA-2026-10-19.md` and `qa/currency.mjs`.
Existing rate-limiting/CSP advisories above remain; passing checks do not make the
application immune to every possible attack.
