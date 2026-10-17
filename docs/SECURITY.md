# Security review — rela. (2026-10-17)

Scope: website, app, database, storage, server actions, public links.
Method: code review + live QA (`qa/*.mjs`). Reviewer: Arena agent at founder's request.

## Verified safe (tested, not just read)

- **Row level security** — enabled on all 12 tables; every policy scopes rows to the
  owning business. Cross-tenant reads/writes are blocked by Postgres itself, not by app code.
- **Public verification** — anonymous visitors can only reach one SECURITY DEFINER RPC,
  `public_document(token)`, which returns whitelisted columns for an unguessable 32-hex
  token. Internal fields (business id, amounts by others, tokens) never leak.
- **Money mutations only via RPC** — `convert_document` / `record_payment` /
  `set_document_status` run as definer but re-verify `business_id` against `auth.uid()`
  and raise typed errors (`document_not_found`, `already_converted`, …).
- **Payment idempotency** — same invoice + same amount within 2 minutes returns the
  existing receipt instead of double-recording; conversions are one-way with a partial
  unique index so a quotation can only convert once.
- **Server secrets stay server-side** — service-role key is only imported by modules
  marked `server-close`; the deploy zip and git both exclude `.env.local`.
- **Auth** — login errors never reveal whether an email exists; password reset goes via
  Supabase email links; the post-login `next` redirect rejects absolute and
  protocol-relative (`//evil.com`) URLs.
- **/admin** — non-admins get a clean 404 (page existence is not disclosed); gated again
  server-side before any write; `noindex`.
  Verified: owner account → 404; admin account → loads; logo upload/remove round-trips.
- **Uploads** — type + 2 MB limits enforced twice (app code and the storage bucket's own
  `allowed_mime_types`/`file_size_limit`); raster-only (PNG/JPEG/WebP), no SVG in shared buckets.
- **XSS** — no `dangerouslySetInnerHTML` anywhere; all customer/business text renders
  through React escaping, including on the anonymous verification page.
- **Print/PDF page** — owner-only; strangers are redirected to login; unknown ids 404.

## Known risks — accepted for launch, with the plan

1. **No app-level rate limiting** on login/signup beyond Supabase Auth's built-in
   IP/email limits and Next server-action throttling. → Add Vercel WAF rules or
   Upstash Ratelimit when traffic warrants (post-launch).
2. **Free-plan multi-account abuse** — nothing stops someone creating N accounts for
   5N documents. Cheap for us, visible in /admin stats. → If it becomes a problem,
   require phone verification for the free tier.
3. **Password minimum is Supabase's default (6 chars).** → Raise to 8+ in the Supabase
   dashboard (one toggle) at launch; breach-checking requires a plan upgrade.
4. **Uploaded images are not content-scanned.** Rendered only via `<img>` (no script
   execution possible) and stored on our own domain + bucket with raster-only MIME.
5. **Audit trail covers conversions/payments only.** → Extend `audit_logs` to plan
   changes when Flutterwave (REL-8) lands.
6. **Single founder session policy** — no admin UI to revoke sessions yet.
   Supabase dashboard can revoke manually today.

## Found & fixed in this review

- Post-login `next` accepted protocol-relative URLs (`//evil.com`) — an open-redirect
  primitive. Now requires `/` and rejects `//`.
- Admin logo upload relied on `instanceof File`, which fails across some server-action
  realms — replaced with duck-typing after QA caught the silent early-return.
