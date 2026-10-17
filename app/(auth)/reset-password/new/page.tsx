import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell, AuthFooterLink } from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/reset-password");

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`Signed in as ${user.email}. Pick something you'll remember.`}
      footer={<AuthFooterLink prompt="Changed your mind?" href="/login" label="Back to log in" />}
    >
      <NewPasswordForm />
    </AuthShell>
  );
}
