import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const { data: business } = await supabase
    .from("businesses")
    .select("name, setup_completed_at, logo_url")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business || !business.name) redirect("/setup/business");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AppShell
      businessName={business.name}
      logoUrl={business.logo_url}
      ownerName={profile?.full_name ?? ""}
      email={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
