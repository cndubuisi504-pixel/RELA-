import { getAgencyWalletData, fundAgencyWalletAction } from "@/lib/partners/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function AgencyWalletPage() {
  const { wallet, transactions } = await getAgencyWalletData();
  const balanceNaira = Math.round(wallet.balanceKobo / 100);
  const receiptsRemaining = Math.floor(balanceNaira / 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          Wallet &amp; Billing
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Central agency balance. All client websites draw from this wallet at ₦100 per successfully issued receipt.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Wallet Balance Hero Card */}
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs lg:col-span-1 h-fit space-y-6">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wider text-ink-3">
              Available Balance
            </p>
            <p className="num mt-2 text-[38px] font-bold tracking-tight text-ink">
              ₦{balanceNaira.toLocaleString()}
            </p>
            <p className="mt-1 text-[13px] text-ink-3">
              ≈ <strong>{receiptsRemaining.toLocaleString()}</strong> receipts remaining
            </p>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-[14px] font-semibold text-ink">Fund Agency Wallet</h3>
            <p className="mt-1 text-[12px] text-ink-3">
              Pay via Paystack or direct transfer. Minimum funding amount is ₦1,000.
            </p>

            <form
              action={async (formData: FormData) => {
                "use server";
                const amount = Number(formData.get("amount"));
                await fundAgencyWalletAction(amount);
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid grid-cols-3 gap-2">
                {[10000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="submit"
                    name="amount"
                    value={amt}
                    className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface-2 p-2.5 text-center hover:border-[var(--primary)] transition-colors"
                  >
                    <span className="num text-[14px] font-semibold text-ink">
                      ₦{(amt / 1000).toFixed(0)}k
                    </span>
                    <span className="text-[10px] text-ink-3">
                      {amt / 100} receipts
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <label htmlFor="custom_amount" className="mb-1 block text-[12px] font-medium text-ink">
                  Custom amount (₦)
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom_amount"
                    name="amount"
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="e.g. 25000"
                    className="min-h-10 flex-1 rounded-xl border border-line bg-surface px-3 text-[14px] text-ink"
                  />
                  <SubmitButton pendingLabel="Processing…">
                    Deposit
                  </SubmitButton>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* Transaction History Ledger */}
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-[16px] font-semibold text-ink">
              Transaction Ledger ({transactions.length})
            </h2>
            <span className="text-[12px] text-ink-3">Atomic ₦100 billing</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            {transactions.length === 0 ? (
              <p className="py-12 text-center text-[13.5px] text-ink-3">
                No transactions recorded yet. Fund your wallet above to start issuing receipts.
              </p>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
                    <th className="pb-3 font-medium">Type / Details</th>
                    <th className="pb-3 font-medium">Reference</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Balance After</th>
                    <th className="pb-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-ink">
                          {tx.type === "deposit"
                            ? "Wallet Deposit"
                            : tx.businessName
                            ? `Receipt: ${tx.businessName}`
                            : "Receipt Deduction"}
                        </p>
                        {tx.projectName && (
                          <p className="text-[11.5px] text-ink-3">{tx.projectName}</p>
                        )}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[11px] text-ink-3 truncate max-w-[120px]">
                        {tx.reference}
                      </td>
                      <td
                        className={[
                          "py-3 pr-3 num font-semibold",
                          tx.amountKobo > 0 ? "text-[var(--success)]" : "text-ink",
                        ].join(" ")}
                      >
                        {tx.amountKobo > 0 ? "+" : "−"}₦
                        {Math.abs(Math.round(tx.amountKobo / 100)).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3 num font-medium text-ink-2">
                        ₦{Math.round(tx.balanceAfterKobo / 100).toLocaleString()}
                      </td>
                      <td className="py-3 text-[11.5px] text-ink-3 text-right whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
