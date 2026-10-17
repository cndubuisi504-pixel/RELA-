"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function SignupForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);

  if (state?.notice) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.notice}</Alert>
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Nothing after a minute or two? Check your spam folder, or{" "}
          <Link href="/support" className="text-[var(--accent-text)] underline underline-offset-4">
            contact support
          </Link>{" "}
          and we&apos;ll confirm you by hand.
        </p>
        <Link href="/login" className="btn btn-ghost btn-block">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        label="Your name"
        name="full_name"
        autoComplete="name"
        placeholder="Adaeze Okafor"
        defaultValue={state?.values?.fullName ?? ""}
        required
      />
      <Field
        label="Email address"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@business.com"
        defaultValue={state?.values?.email ?? ""}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
        required
        hint="Use 8 or more characters. A phrase you'll remember beats a symbol soup."
      />

      <div className="pt-1">
        <SubmitButton pendingLabel="Creating your account…">Start free</SubmitButton>
      </div>

      <p className="text-center text-[12px] leading-relaxed text-ink-3">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
