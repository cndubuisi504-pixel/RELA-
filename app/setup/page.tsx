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
    .select("id, name, setup_completed_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business || !business.name) redirect("/setup/business");
  redirect("/dashboard");
}
