import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/api/auth";

export default async function PartnersLandingPage() {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (user) {
    const supabase = getServiceSupabase();
    const { data: member } = await supabase
      .from("agency_members")
      .select("agency_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (member) {
      redirect("/partners/dashboard");
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-12 md:py-20 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary-soft)]/30 px-3.5 py-1 text-[12.5px] font-semibold text-[var(--primary)] uppercase tracking-wider">
        Rela Partners
      </span>

      <h1 className="mt-6 text-[36px] font-medium tracking-tight text-ink sm:text-[48px] md:text-[54px] leading-tight">
        Receipt infrastructure for <br className="hidden sm:inline" />
        <span className="text-[var(--primary)]">web development agencies</span>
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-2 sm:text-[18px]">
        Onboard hundreds of clients, manage website integrations, and issue
        tamper-proof, branded receipts for <strong>₦100/receipt</strong> from a single agency wallet.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/partners/register" className="btn btn-primary px-6 py-3 text-[15px]">
          Register your agency →
        </Link>
        <Link href="/partners/login" className="btn btn-ghost px-6 py-3 text-[15px]">
          Sign in to partner portal
        </Link>
      </div>

      {/* Feature Grid */}
      <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-xl">
            🏢
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-ink">Independent Client Identities</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
            Every client has their own isolated business profile and verifiable document history that survives agency transfers.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-xl">
            ⚡
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-ink">Central Agency Wallet</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
            Prepay once via Paystack. All client storefronts draw from one central balance with custom per-client spending limits.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-xl">
            🔑
          </div>
          <h3 className="mt-4 text-[16px] font-semibold text-ink">Sandbox &amp; Live API Keys</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
            Free sandbox environment for building and testing. Switch to production with simple secret key rotation and zero code rewrites.
          </p>
        </div>
      </div>
    </div>
  );
}
