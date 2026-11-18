import { getAgencyLogs } from "@/lib/partners/actions";

export default async function AgencyLogsPage() {
  const logs = await getAgencyLogs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          API Traffic &amp; Request Logs
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Real-time telemetry of API requests originating from your clients&apos; websites.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-[16px] font-semibold text-ink">Recent Logs ({logs.length})</h2>
          <span className="text-[12px] text-ink-3">Auto-refreshed</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-[13.5px] text-ink-3">
              No API requests recorded yet. Once integrated, requests made with your project secret keys will show up here.
            </p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Method / Endpoint</th>
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Latency</th>
                  <th className="pb-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3 pr-3">
                      <span
                        className={[
                          "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
                          log.statusCode >= 200 && log.statusCode < 300
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            : log.statusCode === 402
                            ? "bg-[var(--warning-bg,#fef3c7)] text-[var(--warning,#b45309)]"
                            : "bg-[var(--danger,#e11d48)]/10 text-[var(--danger,#e11d48)]",
                        ].join(" ")}
                      >
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-[12px] text-ink">
                      <span className="font-semibold text-ink-2">{log.method}</span> {log.endpoint}
                      {log.errorMessage && (
                        <p className="mt-0.5 text-[11px] text-[var(--danger,#e11d48)]">
                          {log.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-ink-2 font-medium">
                      {log.projectName || "Storefront Project"}
                    </td>
                    <td className="py-3 pr-3 num text-ink-3">
                      {log.durationMs}ms
                    </td>
                    <td className="py-3 text-[11.5px] text-ink-3 text-right whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
