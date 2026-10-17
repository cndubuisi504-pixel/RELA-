import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SetupIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup/business");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, setup_completed_at, logo_url, bank_account_number")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) redirect("/setup/business");
  if (!business.setup_completed_at) {
    if (!business.logo_url) redirect("/setup/branding");
    redirect("/setup/preferences");
  }
  redirect("/dashboard");
}
