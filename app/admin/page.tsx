import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/branding/Logo";
import { LogoManager } from "@/components/admin/LogoManager";
import { requireAdmin, getAdminStats } from "@/lib/admin/actions";
import { getSiteLogoUrl } from "@/lib/site/logo-server";

export const metadata: Metadata = {
  title: "Admin · rela.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) notFound(); // keep the page's existence quiet

  const [logoUrl, stats] = await Promise.all([getSiteLogoUrl(), getAdminStats()]);

  return (
    <main id="main" className="min-h-dvh bg-canvas pb-12">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo href="/" markSize={22} textClassName="text-[20px]" />
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[11.5px] font-medium text-ink-2">
            Rela team only
          </span>
        </div>
      </header>

      <div className="container-x mx-auto max-w-[720px] space-y-5 pt-8">
        <div>
          <h1 className="text-[24px] font-medium tracking-[-0.02em] text-ink">Admin</h1>
          <p className="mt-1 text-[13.5px] text-ink-3">
            Signed in as {gate.user.email}. Changes here apply to the live site immediately.
          </p>
        </div>

        {stats && (
          <section
            aria-label="Launch numbers"
            className="grid grid-cols-3 gap-3"
          >
            {(
              [
                ["Businesses", stats.businesses],
                ["People signed up", stats.users],
                ["Documents created", stats.documents],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-surface p-4">
                <p className="num text-[22px] font-medium leading-none text-ink">{value}</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-3">{label}</p>
              </div>
            ))}
          </section>
        )}

        <LogoManager currentUrl={logoUrl} />

        <p className="text-center text-[12px] text-ink-3">
          <Link href="/dashboard" className="hover:text-ink">
            ← Back to the app
          </Link>
        </p>
      </div>
    </main>
  );
}
