import Link from "next/link";
import { requireAgency } from "@/lib/partners/actions";
import { Logo } from "@/components/branding/Logo";

export const metadata = {
  title: "Rela Partners · Developer & Agency Portal",
  description: "Automated receipt infrastructure for web development agencies and their clients.",
};

const navItems = [
  { label: "Overview", href: "/partners/dashboard" },
  { label: "Clients", href: "/partners/clients" },
  { label: "Websites", href: "/partners/projects" },
  { label: "API Keys", href: "/partners/api-keys" },
  { label: "Wallet & Billing", href: "/partners/wallet" },
  { label: "API Logs", href: "/partners/logs" },
  { label: "Docs", href: "/partners/docs" },
];

export default async function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let agencyData: Awaited<ReturnType<typeof requireAgency>> | null = null;
  try {
    agencyData = await requireAgency();
  } catch {
    // If not authenticated or no agency, render children (e.g. login / register)
  }

  const walletBalanceNaira = agencyData
    ? Math.round(agencyData.wallet.balanceKobo / 100)
    : 0;

  const isLowBalance =
    agencyData &&
    agencyData.wallet.balanceKobo <= agencyData.agency.lowBalanceThresholdKobo;

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-ink">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/partners/dashboard" className="flex items-center gap-2.5">
              <Logo markSize={24} textClassName="text-[20px]" />
              <span className="rounded-md bg-[var(--primary)] px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-[var(--primary-ink)] uppercase">
                Partners
              </span>
            </Link>

            {agencyData && (
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink-2">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                {agencyData.agency.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {agencyData ? (
              <>
                {/* Live Wallet Balance Pill */}
                <Link
                  href="/partners/wallet"
                  className={[
                    "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    isLowBalance
                      ? "border-[var(--danger,#e11d48)] bg-[var(--danger,#e11d48)]/10 text-[var(--danger,#e11d48)]"
                      : "border-line bg-surface hover:border-[var(--border-strong)] text-ink",
                  ].join(" ")}
                  title="Agency central wallet"
                >
                  <span className="text-sm">⚡</span>
                  <span className="num font-semibold">
                    ₦{walletBalanceNaira.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-ink-3">Wallet</span>
                  <span className="rounded bg-[var(--primary)] px-1.5 py-0.2 text-[10.5px] font-bold text-[var(--primary-ink)]">
                    + Fund
                  </span>
                </Link>

                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex text-[12px] text-ink-3 hover:text-ink"
                >
                  Rela Business →
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/partners/login"
                  className="btn btn-ghost btn-sm text-[13px]"
                >
                  Sign in
                </Link>
                <Link
                  href="/partners/register"
                  className="btn btn-primary btn-sm text-[13px]"
                >
                  Register Agency
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs (if agency logged in) */}
        {agencyData && (
          <div className="container-x flex items-center gap-1 overflow-x-auto border-t border-line/60 py-1 text-[13px] no-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container-x py-8 md:py-10">{children}</main>
    </div>
  );
}
