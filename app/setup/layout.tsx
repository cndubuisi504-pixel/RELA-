import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/setup/business");

  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
