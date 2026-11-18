import { getAgencyApiKeys, revokeApiKeyAction } from "@/lib/partners/actions";

export default async function AgencyApiKeysPage() {
  const keys = await getAgencyApiKeys();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          API Credentials
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Manage project secret keys. API credentials are recognized across Rela Core and draw from your agency wallet.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Active Credentials ({keys.length})</h2>
            <p className="mt-0.5 text-[12px] text-ink-3">
              Keep your secret keys safe. Never publish them in browser code or client-side mobile apps.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {keys.length === 0 ? (
            <p className="py-12 text-center text-[13.5px] text-ink-3">
              No API keys generated yet. Create a website project to provision your first API key.
            </p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
                  <th className="pb-3 font-medium">Key Name / Project</th>
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Environment</th>
                  <th className="pb-3 font-medium">Secret Hint</th>
                  <th className="pb-3 font-medium">Rate Limit</th>
                  <th className="pb-3 font-medium">Last Used</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 pr-3">
                      <p className="font-semibold text-ink">{k.name}</p>
                      <p className="text-[11.5px] text-ink-3">{k.projectName || "Project"}</p>
                    </td>
                    <td className="py-3.5 pr-3 text-ink-2 font-medium">
                      {k.businessName || "Client"}
                    </td>
                    <td className="py-3.5 pr-3">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
                          k.environment === "production"
                            ? "bg-[var(--success-bg)] text-[var(--success)]"
                            : "bg-[var(--warning-bg,#fef3c7)] text-[var(--warning,#b45309)]",
                        ].join(" ")}
                      >
                        {k.environment}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-[12px] text-ink-2">
                      {k.keyHint || k.keyPrefix}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-3">
                      {k.rateLimitPerMinute} req/min
                    </td>
                    <td className="py-3.5 pr-3 text-[11.5px] text-ink-3">
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                          })
                        : "Never"}
                    </td>
                    <td className="py-3.5 text-right">
                      {k.status === "active" ? (
                        <form
                          action={async () => {
                            "use server";
                            await revokeApiKeyAction(k.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-[var(--danger,#e11d48)] hover:bg-[var(--danger,#e11d48)]/10"
                          >
                            Revoke
                          </button>
                        </form>
                      ) : (
                        <span className="text-[11px] font-medium text-ink-3 uppercase">
                          Revoked
                        </span>
                      )}
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
