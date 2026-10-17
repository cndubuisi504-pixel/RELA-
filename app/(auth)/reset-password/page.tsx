import type { Metadata } from "next";
import { AuthShell, AuthFooterLink } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send a reset link."
      footer={<AuthFooterLink prompt="Remembered it?" href="/login" label="Back to log in" />}
    >
      <ResetForm />
    </AuthShell>
  );
}
