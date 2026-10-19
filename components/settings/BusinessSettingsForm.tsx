"use client";

import { useActionState } from "react";
import { saveBusinessSettings, type SettingsState } from "@/app/(app)/settings/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

const initial: SettingsState = null;

export type BusinessDefaults = {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  default_mode: string | null;
  default_theme: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
};

export function BusinessSettingsForm({ business }: { business: BusinessDefaults }) {
  const [state, formAction] = useActionState(saveBusinessSettings, initial);
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">What customers see</h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
          This identity prints on every receipt, invoice and quotation — check it carefully.
        </p>
        <div className="mt-3 space-y-3.5">
          <Field
            label="Business name"
            name="name"
            required
            defaultValue={business.name ?? ""}
            error={fe.name}
          />
          <Field
            label="Address"
            name="address"
            required
            defaultValue={business.address ?? ""}
            error={fe.address}
            hint="Shown on your documents so customers can find you."
          />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              label="Business phone"
              name="phone"
              required
              inputMode="tel"
              defaultValue={business.phone ?? ""}
              error={fe.phone}
            />
            <Field
              label="Business email (optional)"
              name="email"
              type="email"
              defaultValue={business.email ?? ""}
              error={fe.email}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Bank details for invoices</h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
          Shown on unpaid invoices under “Pay by bank transfer”. Leave blank if you don’t want it
          printed.
        </p>
        <div className="mt-3 space-y-3.5">
          <Field
            label="Bank name"
            name="bank_name"
            defaultValue={business.bank_name ?? ""}
            error={fe.bank_name}
            placeholder="e.g. GTBank"
          />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field
              label="Account number"
              name="bank_account_number"
              inputMode="numeric"
              defaultValue={business.bank_account_number ?? ""}
              error={fe.bank_account_number}
              placeholder="10 digits"
            />
            <Field
              label="Account name"
              name="bank_account_name"
              defaultValue={business.bank_account_name ?? ""}
              placeholder="Name on the account"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Defaults for new documents</h2>
        <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="setting_mode" className="mb-1.5 block text-[13.5px] font-medium text-ink">
              Default mode
            </label>
            <select
              id="setting_mode"
              name="default_mode"
              defaultValue={business.default_mode === "service" ? "service" : "product"}
              className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink"
            >
              <option value="product">Products — goods &amp; stock</option>
              <option value="service">Services — work &amp; time</option>
            </select>
          </div>
          <div>
            <label htmlFor="setting_theme" className="mb-1.5 block text-[13.5px] font-medium text-ink">
              Document theme
            </label>
            <select
              id="setting_theme"
              name="default_theme"
              defaultValue={business.default_theme ?? "classic"}
              className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink"
            >
              <option value="classic">Classic — clean rules</option>
              <option value="bold">Bold — colour header</option>
              <option value="minimal">Minimal — type-led</option>
            </select>
          </div>
        </div>
      </section>

      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <SubmitButton className="btn btn-primary w-full sm:w-auto">Save changes</SubmitButton>
    </form>
  );
}
