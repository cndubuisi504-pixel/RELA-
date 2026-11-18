import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/api/auth";

export default async function PartnersLoginPage() {
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
    } else {
      redirect("/partners/register");
    }
  }

  // Redirect to standard auth with partner next param
  redirect("/login?next=/partners/dashboard");
}
