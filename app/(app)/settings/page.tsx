import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/branding/ThemeToggle";
import { formatKobo } from "@/lib/money";
import { ArrowRightIcon } from "@/components/ui/icons";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, address, phone, email, logo_url, bank_name, bank_account_number, default_mode, default_theme")
      .eq("owner_id", user!.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, plan, subscription_status, subscription_ends_at")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);

  const rows = [
    { label: "Business name", value: business?.name },
    { label: "Address", value: business?.address },
    { label: "Phone", value: business?.phone },
    { label: "Email", value: business?.email || "Not set" },
    { label: "Default mode", value: business?.default_mode === "service" ? "Services" : "Products" },
    { label: "Document theme", value: business?.default_theme },
    { label: "Bank", value: business?.bank_name ? `${business.bank_name} · ${business.bank_account_number}` : "Not set" },
  ];

  const active = profile?.plan === "starter" && profile?.subscription_status === "active";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em] text-ink">Settings</h1>
        <p className="mt-1 text-[13.5px] text-ink-3">{user?.email}</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-medium text-ink">Business information</h2>
        </div>
        <dl className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
              <dt className="text-[13px] text-ink-3">{r.label}</dt>
              <dd className="max-w-[60%] text-right text-[13.5px] text-ink">{r.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

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
            <h2 className="text-[14px] font-medium text-ink">Subscription</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              {active
                ? "Starter · active"
                : "Free · 5 documents per month"}
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

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Need a hand?</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          Editing business details after setup, changing your logo, and exporting your data are
          coming in the next release. For any of them today, message support and we&apos;ll do it
          with you.
        </p>
        <Link href="/support" className="btn btn-ghost btn-sm mt-3">
          Contact support
        </Link>
      </section>
    </div>
  );
}
