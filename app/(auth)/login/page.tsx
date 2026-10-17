import type { Metadata } from "next";
import { AuthShell, AuthFooterLink } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const notice =
    params.reset === "1"
      ? "Password updated. Log in with your new password."
      : params.error === "link"
        ? "That link has expired. Request a new one below."
        : undefined;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={<AuthFooterLink prompt="New to Rela?" href="/signup" label="Create an account" />}
    >
      <LoginForm next={params.next} notice={notice} />
    </AuthShell>
  );
}
