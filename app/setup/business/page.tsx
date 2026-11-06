import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupShell } from "@/components/setup/SetupShell";
import { BusinessForm } from "@/components/setup/BusinessForm";

export const metadata = { title: "Quick Setup · rela." };

export default async function BusinessStep() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup/business");

  const { data: business } = await supabase
    .from("businesses")
    .select("name, address, phone, email, registration_info")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <SetupShell
      current="business"
      title="Create your business profile"
      subtitle="Only essential information needed. You can create receipts, invoices, and quotations right after."
    >
      <BusinessForm defaults={business ?? undefined} />
    </SetupShell>
  );
}
