"use client";

import { useActionState } from "react";
import { saveBusiness, type SetupState } from "@/lib/setup/actions";
import { Field, TextArea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

type Defaults = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  registration_info?: string;
};

export function BusinessForm({ defaults }: { defaults?: Defaults }) {
  const [state, action] = useActionState<SetupState, FormData>(saveBusiness, null);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Field
        label="Business name"
        name="name"
        defaultValue={state?.values?.name ?? defaults?.name ?? ""}
        placeholder="Adaeze Fabrics"
        autoComplete="organization"
        error={state?.fieldErrors?.name}
        required
      />
      <TextArea
        label="Business address"
        name="address"
        defaultValue={state?.values?.address ?? defaults?.address ?? ""}
        placeholder="12 Allen Avenue, Ikeja, Lagos"
        rows={2}
        error={state?.fieldErrors?.address}
        required
      />
      <Field
        label="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        defaultValue={state?.values?.phone ?? defaults?.phone ?? ""}
        placeholder="0803 123 4567"
        autoComplete="tel"
        error={state?.fieldErrors?.phone}
        hint="Shown to customers. WhatsApp messages will use this number's country code."
        required
      />
      <Field
        label="Business email"
        name="email"
        type="email"
        inputMode="email"
        defaultValue={state?.values?.email ?? defaults?.email ?? ""}
        placeholder="hello@adaezefabrics.com"
        autoComplete="email"
        error={state?.fieldErrors?.email}
        hint="Optional, but customers like having a way to reply."
      />
      <Field
        label="Registration information"
        name="registration_info"
        defaultValue={state?.values?.registration_info ?? defaults?.registration_info ?? ""}
        placeholder="RC 1234567"
        hint="Optional. Appears under your business name on invoices."
      />

      <div className="pt-2">
        <SubmitButton pendingLabel="Saving…">Continue to branding</SubmitButton>
      </div>
    </form>
  );
}
