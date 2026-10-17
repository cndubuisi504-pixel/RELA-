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
npm i -g vercel
vercel login
vercel link --project rela        # select the existing project
vercel --prod
```

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

Still to add when available: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FLW_PUBLIC_KEY`,
`FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `FLW_PLAN_CODE`.

## Database

- Project ref: `zglkbrivfkabmlhrllbf` (region `eu-west-1`)
- Migration applied: `init_schema` — mirrors `supabase/migrations/0001_init.sql`
- 11 tables, RLS on every one, atomic numbering, `public_document()` for verification
- Storage bucket: `branding` (public read, owner-scoped writes, 2 MB, png/jpeg/webp)

To re-apply from scratch: paste `supabase/migrations/0001_init.sql` into the Supabase
SQL editor and run it.

## What the deploy contains today

Landing page, `/api-docs`, `/support`, `/terms`, `/privacy`, 404, robots and sitemap.
`/signup` and `/login` show the early-access gate until auth ships in the next stage.
