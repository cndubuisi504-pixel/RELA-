import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Start free" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your Rela account"
      subtitle="Five free documents every month. No card, no setup fee."
      footer={
        <span>
          Already have an account?{" "}
          <a href="/login" className="inline-flex min-h-11 items-center font-medium text-[var(--accent-text)] hover:underline">
            Log in
          </a>
        </span>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
