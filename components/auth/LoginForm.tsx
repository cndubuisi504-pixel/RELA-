"use client";

import { useActionState } from "react";
import Link from "next/link";
import { logIn, type AuthState } from "@/lib/auth/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(logIn, null);

  return (
    <form action={action} className="space-y-4" noValidate>
      {notice && <Alert tone="success">{notice}</Alert>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <input type="hidden" name="next" value={next ?? "/dashboard"} />

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
        autoComplete="current-password"
        required
      />

      <div className="flex justify-end">
        <Link
          href="/reset-password"
          className="inline-flex min-h-11 items-center text-[13px] font-medium text-[var(--accent-text)] hover:underline"
        >
          Forgot your password?
        </Link>
      </div>

      <SubmitButton pendingLabel="Logging you in…">Log in</SubmitButton>
    </form>
  );
}
