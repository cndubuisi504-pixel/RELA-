import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/branding/ThemeToggle";
import { ArrowRightIcon } from "@/components/ui/icons";
import { BusinessSettingsForm } from "@/components/settings/BusinessSettingsForm";
import { LoginSettingsForm } from "@/components/settings/LoginSettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "name, address, phone, email, logo_url, bank_name, bank_account_name, bank_account_number, default_mode, default_theme",
      )
      .eq("owner_id", user!.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, plan, subscription_status, subscription_ends_at")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);

  const active = profile?.plan === "starter" && profile?.subscription_status === "active";
  const renewsOn = profile?.subscription_ends_at
    ? new Date(profile.subscription_ends_at).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Settings</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">
          Your business identity, payments and sign-in — everything here feeds your documents.
        </p>
      </div>

      <BusinessSettingsForm
        business={{
          name: business?.name ?? null,
          address: business?.address ?? null,
          phone: business?.phone ?? null,
          email: business?.email ?? null,
          default_mode: business?.default_mode ?? null,
          default_theme: business?.default_theme ?? null,
          bank_name: business?.bank_name ?? null,
          bank_account_name: business?.bank_account_name ?? null,
          bank_account_number: business?.bank_account_number ?? null,
        }}
      />

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-medium text-ink">Appearance</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-3">Light or dark. Your choice is remembered.</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-medium text-ink">Plan</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
              {active ? (
                <>
                  Starter · active
                  {renewsOn ? ` · renews ${renewsOn}` : ""}
                </>
              ) : (
                "Free · 5 documents per month"
              )}
            </p>
          </div>
          <Link
            href="/upgrade"
            className="inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-[var(--accent-text)] hover:underline"
          >
            {active ? "Manage" : "Upgrade"}
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </section>

      <LoginSettingsForm currentEmail={user?.email ?? ""} />

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Need a hand?</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          Your logo, a special document layout, or exporting all your data — tell us what you need
          and we&apos;ll set it up with you.
        </p>
        <Link href="/support" className="btn btn-ghost btn-sm mt-3">
          Contact support
        </Link>
      </section>
    </div>
  );
}
