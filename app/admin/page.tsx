import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/branding/Logo";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { requireAdmin, getAdminFullData } from "@/lib/admin/actions";
import { getSiteLogoUrl } from "@/lib/site/logo-server";

export const metadata: Metadata = {
  title: "Admin Command Center · rela.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) notFound(); // keep the page's existence quiet

  const [logoUrl, fullData] = await Promise.all([
    getSiteLogoUrl(),
    getAdminFullData(),
  ]);

  if (!fullData) notFound();

  return (
    <main id="main" className="min-h-dvh bg-canvas pb-16">
      <header className="border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="container-x mx-auto max-w-[1180px] flex h-16 items-center justify-between">
          <Logo href="/" markSize={22} textClassName="text-[20px]" />
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[11.5px] font-medium text-ink-2">
              Rela Team Only
            </span>
          </div>
        </div>
      </header>

      <div className="container-x mx-auto max-w-[1180px] pt-8">
        <AdminDashboard
          data={fullData}
          adminEmail={gate.user.email ?? "admin"}
          logoUrl={logoUrl}
        />
      </div>
    </main>
  );
}
