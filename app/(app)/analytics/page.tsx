import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user!.id)
    .maybeSingle();

  const eligible = profile?.plan === "starter" && profile?.subscription_status === "active";

  if (!eligible) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Analytics</h1>
          <p className="mt-1 max-w-[50ch] text-[13.5px] leading-relaxed text-ink-3">
            Revenue collected, outstanding balances and your best customers — available on Starter.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="grid grid-cols-2 gap-3" aria-hidden>
            {["Revenue collected", "Outstanding", "Paid receipts", "Overdue invoices"].map((label) => (
              <div key={label} className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[11.5px] uppercase tracking-[0.1em] text-ink-3">{label}</p>
                <div className="mt-2 h-5 w-20 rounded-md bg-line" />
              </div>
            ))}
          </div>
          <p className="mt-5 text-[14px] font-medium text-ink">Unlock analytics</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
            Analytics is part of Starter. Your documents are already being recorded, so the moment
            you upgrade the numbers are there.
          </p>
          <Link href="/upgrade" className="btn btn-primary btn-sm mt-4">
            See Starter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Analytics</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">This month across all documents.</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface px-5 py-10 text-center">
        <p className="text-[15px] font-medium text-ink">Charts arrive in the next release</p>
        <p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] leading-relaxed text-ink-3">
          Your data is being collected. Totals, trends and top customers will render here as soon
          as documents start flowing.
        </p>
      </div>
    </div>
  );
}
