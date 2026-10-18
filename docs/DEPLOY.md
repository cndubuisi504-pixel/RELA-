# Deploying rela.

The Vercel project (`rela`) and the Supabase project (`zglkbrivfkabmlhrllbf`) already
exist, and the database schema is applied. Environment variables are set on Vercel.
The only missing step is getting the source into Vercel — pick **one** of the two paths.

---

## Path A — GitHub (recommended: every push deploys)

1. Create an empty **private** repo on GitHub called `rela` (no README, no .gitignore).
2. From the folder above this one:

   ```bash
   cd rela
   git remote add origin git@github.com:<your-username>/rela.git
   git branch -M main
   git push -u origin main
   ```

3. In Vercel → project **rela** → **Settings → Git → Connect Git Repository** →
   choose `rela`. Framework preset is already `Next.js`; leave build settings alone.
4. Vercel builds on the push. First build takes ~90 seconds.

## Path B — Vercel CLI (no GitHub)

```bash
cd rela
npx vercel login                  # follow the emailed link
npm run deploy                    # links the project + deploys to production
```

(`npm run deploy` runs `vercel link --yes --project rela && vercel --prod --yes`.)

## After the first deploy

1. Copy the production URL (e.g. `https://rela-xxxx.vercel.app`).
2. In Vercel → Settings → Environment Variables, set:
   `NEXT_PUBLIC_APP_URL = https://<that-url>` (all three environments), then redeploy.
3. In Supabase → Authentication → URL Configuration:
   - **Site URL**: `https://<that-url>`
   - **Redirect URLs**: add `https://<that-url>/auth/callback` and
     `http://localhost:3000/auth/callback`
4. When you have a real domain, add it in Vercel → Domains, then repeat step 2 and 3
   with the custom domain.

## Environment variables already set on Vercel

| Key | Where it came from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project — **server only**, sensitive |
| `ADMIN_EMAIL` | `chimdindundubuisirich@gmail.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `therelasolutions@gmail.com` |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | `2349153230482` |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard — **server only**, sensitive (test key now, swap to live) |
| `PAYSTACK_PUBLIC_KEY` | Paystack dashboard — sensitive, also server-side; hosted checkout needs no client key |
| `NEXT_PUBLIC_APP_URL` | `https://rela-iota-eight.vercel.app` — the project's actual production URL (already set) |

## Paystack go-live checklist

1. Deploy (see above), confirm the site loads at the production URL, and that
   `NEXT_PUBLIC_APP_URL` matches it — the checkout callback depends on it.
2. Paystack dashboard → **Settings → Webhooks**: add
   `https://rela-iota-eight.vercel.app/api/webhooks/paystack`. (Point it at the **live**
   integration when live keys replace the test ones.)
3. Replace the two Paystack env vars with `sk_live_…` / `pk_live_…` (*not* in chat —
   Vercel dashboard → Project → Settings → Environment Variables), trigger a
   redeploy so server modules pick them up, and set the webhook to the live config.
4. Make one real ₦2,500 payment end-to-end, confirm Starter activates, then refund
   it from the Paystack dashboard if you don't want the charge standing.
5. Done. The monthly renewal reminder flow is manual-by-design for v1 (email the
   support address from /upgrade).

## Database

- Project ref: `zglkbrivfkabmlhrllbf` (region `eu-west-1`)
- Migration applied: `init_schema` — mirrors `supabase/migrations/0001_init.sql`
- 11 tables, RLS on every one, atomic numbering, `public_document()` for verification
- Storage bucket: `branding` (public read, owner-scoped writes, 2 MB, png/jpeg/webp)

To re-apply from scratch: paste `supabase/migrations/0001_init.sql` into the Supabase
SQL editor and run it.

## What the deploy contains today

Everything — the complete app: landing, auth, business setup, dashboard,
documents (create, convert, payments, PDF print), public verify pages, upgrade
with Paystack checkout and webhook, admin, support, terms, privacy, API docs.
QA suites live in `qa/` and are not required for the build (and are not part of
deployments prepared from the trimmed manifest).

