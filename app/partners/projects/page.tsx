import Link from "next/link";
import { getAgencyClients, getAgencyProjects, createProjectAction } from "@/lib/partners/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function AgencyProjectsPage() {
  const [clients, projects] = await Promise.all([
    getAgencyClients(),
    getAgencyProjects(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          Website Projects
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Manage website storefronts and web applications integrating Rela for automated receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Create Website Project Form */}
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs lg:col-span-1 h-fit">
          <div className="border-b border-line pb-3">
            <h2 className="text-[16px] font-semibold text-ink">Add Website Project</h2>
            <p className="mt-1 text-[12px] text-ink-3">
              Generates project-specific API credentials automatically.
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="mt-4 rounded-xl border border-line bg-surface-2/40 p-4 text-[13px] text-ink-3">
              <p>You must onboard at least one client business before adding a website project.</p>
              <Link href="/partners/clients" className="mt-2.5 inline-block font-medium text-[var(--accent-text)] underline">
                + Onboard your first client →
              </Link>
            </div>
          ) : (
            <form action={createProjectAction} className="mt-4 space-y-4">
              <div>
                <label htmlFor="business_id" className="mb-1.5 block text-[13px] font-medium text-ink">
                  Client business
                </label>
                <select
                  id="business_id"
                  name="business_id"
                  required
                  className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink"
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label="Project name"
                name="project_name"
                placeholder="e.g. Main WooCommerce Store"
                required
              />

              <Field
                label="Website URL"
                name="website_url"
                type="url"
                placeholder="https://clientstore.com"
              />

              <div>
                <label htmlFor="environment" className="mb-1.5 block text-[13px] font-medium text-ink">
                  Environment
                </label>
                <select
                  id="environment"
                  name="environment"
                  defaultValue="production"
                  className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[14px] text-ink"
                >
                  <option value="production">Production (₦100/receipt from agency wallet)</option>
                  <option value="sandbox">Sandbox (100% Free testing)</option>
                </select>
              </div>

              <div className="pt-2">
                <SubmitButton pendingLabel="Registering website project…">
                  Create Project &amp; Generate Key →
                </SubmitButton>
              </div>
            </form>
          )}
        </section>

        {/* Website Projects Table */}
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-[16px] font-semibold text-ink">
              All Websites ({projects.length})
            </h2>
            <Link href="/partners/api-keys" className="text-[12px] font-medium text-[var(--accent-text)] hover:underline">
              View API keys →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            {projects.length === 0 ? (
              <p className="py-12 text-center text-[13.5px] text-ink-3">
                No website projects created yet. Add a website using the form on the left.
              </p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Environment</th>
                    <th className="pb-3 font-medium">Receipts</th>
                    <th className="pb-3 font-medium">API Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3.5 pr-3">
                        <p className="font-semibold text-ink">{p.name}</p>
                        {p.websiteUrl && (
                          <a
                            href={p.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11.5px] text-ink-3 hover:underline"
                          >
                            {p.websiteUrl.replace(/^https?:\/\//, "")} ↗
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 font-medium text-ink-2">
                        {p.businessName}
                      </td>
                      <td className="py-3.5 pr-3">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
                            p.environment === "production"
                              ? "bg-[var(--success-bg)] text-[var(--success)]"
                              : "bg-[var(--warning-bg,#fef3c7)] text-[var(--warning,#b45309)]",
                          ].join(" ")}
                        >
                          {p.environment}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 num font-medium">
                        {p.receiptsCount.toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        {p.keyHint ? (
                          <span className="font-mono text-[11px] text-ink-3">
                            {p.keyHint}
                          </span>
                        ) : (
                          <Link
                            href="/partners/api-keys"
                            className="text-[11.5px] text-[var(--accent-text)] hover:underline"
                          >
                            Generate key
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
