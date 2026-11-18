import { getAgencyClients, createClientBusinessAction } from "@/lib/partners/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function AgencyClientsPage() {
  const clients = await getAgencyClients();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          Client Businesses
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Onboard and manage business profiles for your website clients. Each client maintains an independent identity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Onboard New Client Form */}
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs lg:col-span-1 h-fit">
          <div className="border-b border-line pb-3">
            <h2 className="text-[16px] font-semibold text-ink">Onboard New Client</h2>
            <p className="mt-1 text-[12px] text-ink-3">
              Creates an independent business profile for your client.
            </p>
          </div>

          <form action={createClientBusinessAction} className="mt-4 space-y-4">
            <Field
              label="Business / Client name"
              name="business_name"
              placeholder="e.g. Bella Naturals Lagos"
              required
            />

            <Field
              label="Contact phone / WhatsApp"
              name="phone"
              type="tel"
              placeholder="0803 123 4567"
            />

            <Field
              label="Business email"
              name="email"
              type="email"
              placeholder="orders@bellanaturals.com"
            />

            <Field
              label="Storefront address"
              name="address"
              placeholder="12 Admiralty Way, Lekki, Lagos"
            />

            <Field
              label="Spending limit (₦ Naira)"
              name="spending_limit_naira"
              type="number"
              placeholder="Optional (e.g. 50000)"
              hint="Leave blank for unlimited (draws from central agency wallet)."
            />

            <div className="pt-2">
              <SubmitButton pendingLabel="Creating business profile…">
                Create Client Profile →
              </SubmitButton>
            </div>
          </form>
        </section>

        {/* Clients Directory Table */}
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-[16px] font-semibold text-ink">
              Managed Clients ({clients.length})
            </h2>
          </div>

          <div className="mt-4 overflow-x-auto">
            {clients.length === 0 ? (
              <p className="py-12 text-center text-[13.5px] text-ink-3">
                No clients onboarded yet. Use the form on the left to add your first client.
              </p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
                    <th className="pb-3 font-medium">Business</th>
                    <th className="pb-3 font-medium">Websites</th>
                    <th className="pb-3 font-medium">Receipts</th>
                    <th className="pb-3 font-medium">Spent</th>
                    <th className="pb-3 font-medium">Spending Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {clients.map((c) => {
                    const spentNaira = Math.round(c.spentKobo / 100);
                    const limitNaira = c.spendingLimitKobo ? Math.round(c.spendingLimitKobo / 100) : null;

                    return (
                      <tr key={c.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="py-3.5 pr-3">
                          <p className="font-semibold text-ink">{c.name}</p>
                          <p className="text-[11.5px] text-ink-3">
                            {c.email || c.phone || "No contact info"}
                          </p>
                        </td>
                        <td className="py-3.5 pr-3 font-medium">{c.projectsCount}</td>
                        <td className="py-3.5 pr-3 num font-medium">
                          {c.totalReceiptsCount.toLocaleString()}
                        </td>
                        <td className="py-3.5 pr-3 num font-semibold text-ink">
                          ₦{spentNaira.toLocaleString()}
                        </td>
                        <td className="py-3.5">
                          {limitNaira ? (
                            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-ink">
                              Cap: ₦{limitNaira.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-ink-3">Unlimited</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
