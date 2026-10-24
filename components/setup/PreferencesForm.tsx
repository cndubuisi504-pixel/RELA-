"use client";

import { useActionState, useState } from "react";
import { savePreferences, skipSetupToExplore, type SetupState } from "@/lib/setup/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { CheckIcon } from "@/components/ui/icons";

const modes = [
  {
    id: "product",
    label: "Products",
    body: "Sell goods. Shows quantity × unit price.",
  },
  {
    id: "service",
    label: "Services",
    body: "Sell work. Hides quantity unless you turn it on.",
  },
];

export function PreferencesForm({
  defaultMode,
  defaultTheme,
  bankName,
  bankAccountName,
  bankAccountNumber,
}: {
  defaultMode: string;
  defaultTheme: string;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
}) {
  const [state, action] = useActionState<SetupState, FormData>(savePreferences, null);
  const [mode, setMode] = useState(defaultMode === "service" ? "service" : "product");

  return (
    <form action={action} className="space-y-6" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <fieldset>
        <legend className="mb-2 text-[13.5px] font-medium text-ink">What do you mostly sell?</legend>
        <input type="hidden" name="default_mode" value={mode} />
        <div className="grid gap-2 sm:grid-cols-2">
          {modes.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={active}
                className={[
                  "flex flex-col rounded-xl border p-3.5 text-left transition-colors",
                  active
                    ? "border-primary bg-[var(--primary-soft)]"
                    : "border-line bg-surface hover:border-[var(--border-strong)]",
                ].join(" ")}
              >
                <span className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-ink">{m.label}</span>
                  <span
                    className={[
                      "flex h-4 w-4 items-center justify-center rounded-full border",
                      active
                        ? "border-primary bg-primary text-[var(--primary-ink)]"
                        : "border-line text-transparent",
                    ].join(" ")}
                  >
                    <CheckIcon size={10} strokeWidth={3} />
                  </span>
                </span>
                <span className="mt-1 text-[12px] leading-snug text-ink-3">{m.body}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="pref_theme" className="mb-1.5 block text-[13.5px] font-medium text-ink">
          Default document theme
        </label>
        <select
          id="pref_theme"
          name="default_theme"
          defaultValue={defaultTheme}
          className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink"
        >
          <option value="classic">Classic — clean rules</option>
          <option value="bold">Bold — colour header</option>
          <option value="minimal">Minimal — type-led</option>
        </select>
      </div>

      <fieldset className="rounded-2xl border border-line bg-surface p-4">
        <legend className="px-1 text-[13.5px] font-medium text-ink">
          Bank details for invoices <span className="text-[12px] font-normal text-ink-3">(optional)</span>
        </legend>
        <p className="mb-4 text-[12.5px] leading-relaxed text-ink-3">
          Customers pay you directly. Rela never touches the money and never asks for your card or BVN.
        </p>
        <div className="space-y-3">
          <Field
            label="Bank name"
            name="bank_name"
            defaultValue={state?.values?.bank_name ?? bankName ?? ""}
            placeholder="GTBank"
            error={state?.fieldErrors?.bank_name}
          />
          <Field
            label="Account name"
            name="bank_account_name"
            defaultValue={state?.values?.bank_account_name ?? bankAccountName ?? ""}
            placeholder="Adaeze Okafor"
            error={state?.fieldErrors?.bank_account_name}
          />
          <Field
            label="Account number"
            name="bank_account_number"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            defaultValue={state?.values?.bank_account_number ?? bankAccountNumber ?? ""}
            placeholder="0123456789"
            error={state?.fieldErrors?.bank_account_number}
            hint="10 digits. Appears on invoices so customers can transfer straight to you."
          />
        </div>
      </fieldset>

      <div className="flex flex-col items-center gap-2.5">
        <SubmitButton pendingLabel="Finishing setup…">Finish setup</SubmitButton>
        <button
          type="submit"
          formAction={skipSetupToExplore}
          className="btn btn-ghost btn-block text-[13.5px] text-ink-3 hover:text-ink font-normal"
        >
          Skip &amp; explore dashboard →
        </button>
      </div>
      <p className="text-center text-[12px] text-ink-3">
        You can change all of this later in Settings.
      </p>
    </form>
  );
}
