"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function ResetForm() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, null);

  if (state?.notice) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.notice}</Alert>
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          The link opens a page where you choose a new password. If it doesn&apos;t arrive in a
          few minutes, check spam or contact support.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label="Email address"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@business.com"
        required
      />
      <SubmitButton pendingLabel="Sending the link…">Send reset link</SubmitButton>
    </form>
  );
}
