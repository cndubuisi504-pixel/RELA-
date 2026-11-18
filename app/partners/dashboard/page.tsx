import Link from "next/link";
import { getAgencyDashboardData } from "@/lib/partners/actions";

export default async function AgencyDashboardPage() {
  const data = await getAgencyDashboardData();
  const { agency, wallet, totalClients, totalWebsites, receiptsGenerated, walletBalanceNaira } =
    data;

  const isLowBalance = wallet.balanceKobo <= agency.lowBalanceThresholdKobo;

  return (
    <div className="space-y-8">
      {/* Low Balance Warning Banner */}
      {isLowBalance && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--warning-border,#f59e0b)] bg-[var(--warning-bg,#fef3c7)]/30 p-4 text-[13.5px]">
          <div className="flex items-center gap-2.5 text-ink">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-ink">Low wallet balance: ₦{walletBalanceNaira.toLocaleString()}</p>
              <p className="text-[12.5px] text-ink-2">
                Your wallet is below the ₦{Math.round(agency.lowBalanceThresholdKobo / 100).toLocaleString()} warning threshold. Top up to ensure client checkouts continue uninterrupted.
              </p>
            </div>
          </div>
          <Link href="/partners/wallet" className="btn btn-primary btn-sm">
            Top up wallet →
          </Link>
        </section>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink sm:text-[30px]">
            {agency.name}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-3">
            Agency infrastructure overview · {totalClients} clients · {totalWebsites} websites integrated
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/partners/clients" className="btn btn-ghost btn-sm text-[13px]">
            + Onboard Client
          </Link>
          <Link href="/partners/projects" className="btn btn-ghost btn-sm text-[13px]">
            + Add Website Project
          </Link>
          <Link href="/partners/wallet" className="btn btn-primary btn-sm text-[13px]">
            ⚡ Fund Wallet
          </Link>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
            Central Wallet
          </p>
          <p className="num mt-2 text-[26px] font-semibold tracking-tight text-ink">
            ₦{walletBalanceNaira.toLocaleString()}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">
            {Math.floor(walletBalanceNaira / 100)} receipts remaining
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
            Receipts Issued
          </p>
          <p className="num mt-2 text-[26px] font-semibold tracking-tight text-ink">
            {receiptsGenerated.toLocaleString()}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">All client websites</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
            Client Businesses
          </p>
          <p className="num mt-2 text-[26px] font-semibold tracking-tight text-ink">
            {totalClients}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">Independent profiles</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <p className="text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
            Integrated Websites
          </p>
          <p className="num mt-2 text-[26px] font-semibold tracking-tight text-ink">
            {totalWebsites}
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">Active API projects</p>
        </div>
      </div>

      {/* Split Section: Recent Transactions & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-[15px] font-semibold text-ink">Recent Wallet Activity</h2>
            <Link href="/partners/wallet" className="text-[12px] font-medium text-[var(--accent-text)] hover:underline">
              View all →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-line/60">
            {data.recentTransactions.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-3">
                No wallet transactions yet. Fund your wallet to begin generating receipts.
              </p>
            ) : (
              data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">
                      {tx.type === "deposit"
                        ? "Wallet Deposit"
                        : tx.businessName
                        ? `Receipt: ${tx.businessName}`
                        : "Receipt Deduction"}
                    </p>
                    <p className="text-[11px] text-ink-3">
                      {new Date(tx.createdAt).toLocaleString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={[
                      "num font-semibold shrink-0",
                      tx.amountKobo > 0 ? "text-[var(--success)]" : "text-ink",
                    ].join(" ")}
                  >
                    {tx.amountKobo > 0 ? "+" : "−"}₦
                    {Math.abs(Math.round(tx.amountKobo / 100)).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent API Logs */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-[15px] font-semibold text-ink">Recent API Traffic</h2>
            <Link href="/partners/logs" className="text-[12px] font-medium text-[var(--accent-text)] hover:underline">
              View logs →
            </Link>
          </div>

          <div className="mt-3 divide-y divide-line/60">
            {data.recentLogs.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-3">
                No API requests recorded yet. Integrate a website project to see live traffic.
              </p>
            ) : (
              data.recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "rounded px-1.5 py-0.2 text-[10px] font-bold uppercase",
                          log.statusCode >= 200 && log.statusCode < 300
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            : "bg-[var(--danger,#e11d48)]/10 text-[var(--danger,#e11d48)]",
                        ].join(" ")}
                      >
                        {log.statusCode}
                      </span>
                      <p className="font-mono text-[12px] text-ink truncate">
                        {log.endpoint}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-3 truncate">
                      {log.projectName || "Storefront"} · {log.durationMs}ms
                    </p>
                  </div>
                  <span className="text-[11px] text-ink-3 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
