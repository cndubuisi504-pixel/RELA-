import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupShell } from "@/components/setup/SetupShell";
import { PreferencesForm } from "@/components/setup/PreferencesForm";

export const metadata = { title: "Preferences · Setup" };

export default async function PreferencesStep() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup/preferences");

  const { data: business } = await supabase
    .from("businesses")
    .select("default_mode, default_theme, bank_name, bank_account_name, bank_account_number")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) redirect("/setup/business");

  return (
    <SetupShell
      current="preferences"
      title="How you work"
      subtitle="Set sensible defaults now — every document can still override them."
    >
      <PreferencesForm
        defaultMode={business.default_mode ?? "product"}
        defaultTheme={business.default_theme ?? "classic"}
        bankName={business.bank_name}
        bankAccountName={business.bank_account_name}
        bankAccountNumber={business.bank_account_number}
      />
    </SetupShell>
  );
}
