import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CheckIcon } from "@/components/ui/icons";
import { CheckoutButton } from "@/components/billing/CheckoutButton";

export const metadata = { title: "Upgrade" };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const { paid } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status, subscription_ends_at")
    .eq("id", user!.id)
    .maybeSingle();

  const active = profile?.plan === "starter" && profile?.subscription_status === "active";

  const free = [
    "5 documents per calendar month",
    "Receipts, invoices and quotations",
    "WhatsApp sharing, PDF and image export",
    "Public verification links",
    "rela. watermark",
  ];
  const starter = [
    "Unlimited documents",
    "No watermark",
    "Quotation → invoice → receipt conversion",
    "Payment tracking and outstanding balances",
    "Analytics for Business Pro",
    "Priority support",
  ];

  return (
    <div className="space-y-5">
      {paid === "1" && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-[13.5px] font-medium text-[var(--success)]">
          <CheckIcon size={16} strokeWidth={3} />
          Payment verified — Starter is active on your account.
        </div>
      )}
      {(paid === "failed" || paid === "invalid") && (
        <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3 text-[13.5px] text-[var(--danger)]">
          We couldn’t verify that payment. If money left your account, message support with the
          time and amount and we’ll sort it out immediately.
        </div>
      )}
      <div>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">
          {active ? "You’re on Starter" : "Upgrade to Starter"}
        </h1>
        <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-3">
          {active
            ? "Unlimited documents, no watermark, and the full conversion workflow."
            : "₦2,500 a month. Unlimited documents, no watermark, and the conversion workflow that saves you retyping."}
        </p>
      </div>

      {active && (
        <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] p-4 text-[13.5px] text-[var(--success)]">
          <p className="flex items-center gap-2 font-medium">
            <CheckIcon size={15} strokeWidth={3} />
            Active
            {profile?.subscription_ends_at &&
              ` · renews ${new Date(profile.subscription_ends_at).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[16px] font-medium text-ink">Free</h2>
          <p className="num mt-1 text-[26px] font-medium text-ink">₦0</p>
          <ul className="mt-4 space-y-2">
            {free.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-ink-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line text-ink-3">
                  <CheckIcon size={9} strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border-2 border-[var(--primary)] bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium text-ink">Starter</h2>
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--primary-ink)]">
              Recommended
            </span>
          </div>
          <p className="num mt-1 text-[26px] font-medium text-ink">
            ₦2,500 <span className="text-[13px] font-normal text-ink-3">/ month</span>
          </p>
          <ul className="mt-4 space-y-2">
            {starter.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-ink-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[var(--primary-ink)]">
                  <CheckIcon size={9} strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-5">
            {active ? (
              <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink-3">
                {profile?.subscription_ends_at
                  ? `Starter is active until ${new Date(profile.subscription_ends_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}. Renew below to add another month on top.`
                  : "Starter is active on your account."}
              </p>
            ) : null}
            {!active && <CheckoutButton />}
          </div>
        </section>
      </div>

      <p className="text-center text-[12px] text-ink-3">
        Cancel anytime. Historic documents stay yours, and the plan simply returns to Free.
      </p>
    </div>
  );
}
