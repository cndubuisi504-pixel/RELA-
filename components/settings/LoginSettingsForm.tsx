"use client";

import { useActionState } from "react";
import { saveLogin, type SettingsState } from "@/app/(app)/settings/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initial: SettingsState = null;

export function LoginSettingsForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction] = useActionState(saveLogin, initial);
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-[14px] font-medium text-ink">Sign-in</h2>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
        You sign in as <span className="font-medium text-ink-2">{currentEmail}</span>. Email changes
        need one confirmation tap in your inbox; passwords update instantly.
      </p>
      <form action={formAction} className="mt-3 space-y-3.5" noValidate>
        <Field
          label="New email (leave blank to keep this one)"
          name="login_email"
          type="email"
          autoComplete="email"
          placeholder={currentEmail}
          error={fe.login_email}
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="8+ characters"
            error={fe.password}
          />
          <Field
            label="Repeat it"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Same as on the left"
            error={fe.password_confirm}
          />
        </div>
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}
        <SubmitButton className="btn btn-ghost">Update sign-in</SubmitButton>
      </form>
    </section>
  );
}
