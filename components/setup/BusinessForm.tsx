"use client";

import { useActionState, useState } from "react";
import { saveBusiness, skipSetupToExplore, type SetupState } from "@/lib/setup/actions";
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
  const [showMore, setShowMore] = useState(
    Boolean(defaults?.address || defaults?.email || defaults?.registration_info),
  );

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-[var(--shadow-1)]">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
            Essential Details
          </span>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            All that&apos;s required to start creating receipts, invoices, and quotes immediately.
          </p>
        </div>

        <Field
          label="Business name"
          name="name"
          defaultValue={state?.values?.name ?? defaults?.name ?? ""}
          placeholder="e.g. Adaeze Studios or Apex Logistics"
          autoComplete="organization"
          error={state?.fieldErrors?.name}
          required
        />

        <Field
          label="Phone number / WhatsApp"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={state?.values?.phone ?? defaults?.phone ?? ""}
          placeholder="0803 123 4567"
          autoComplete="tel"
          error={state?.fieldErrors?.phone}
          hint="Appears on documents so customers can reach you or verify payment."
          required
        />
      </div>

      <div className="rounded-2xl border border-line/80 bg-surface/60 p-4 transition-all">
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex w-full items-center justify-between text-left text-[13.5px] font-medium text-ink hover:text-ink-2"
        >
          <span>Optional details (Address, Email, Reg #)</span>
          <span className="text-xs text-ink-3">{showMore ? "− Hide" : "+ Add now"}</span>
        </button>

        {showMore && (
          <div className="mt-4 space-y-4 border-t border-line/60 pt-4">
            <TextArea
              label="Business address"
              name="address"
              defaultValue={state?.values?.address ?? defaults?.address ?? ""}
              placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos (optional)"
              rows={2}
              error={state?.fieldErrors?.address}
              hint="Optional. You can add or change this anytime in Settings."
            />
            <Field
              label="Business email"
              name="email"
              type="email"
              inputMode="email"
              defaultValue={state?.values?.email ?? defaults?.email ?? ""}
              placeholder="hello@yourbusiness.com"
              autoComplete="email"
              error={state?.fieldErrors?.email}
              hint="Optional."
            />
            <Field
              label="Registration information"
              name="registration_info"
              defaultValue={state?.values?.registration_info ?? defaults?.registration_info ?? ""}
              placeholder="RC 1234567 or BN 987654"
              hint="Optional. Displayed under your business name."
            />
          </div>
        )}
      </div>

      <div className="pt-2 flex flex-col items-center gap-2.5">
        <SubmitButton pendingLabel="Creating business…">Create business &amp; open dashboard →</SubmitButton>
        <button
          type="submit"
          formAction={skipSetupToExplore}
          className="btn btn-ghost btn-block text-[13.5px] text-ink-3 hover:text-ink font-normal"
        >
          Skip &amp; explore dashboard →
        </button>
      </div>
    </form>
  );
}
