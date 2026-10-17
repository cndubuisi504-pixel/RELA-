"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveBranding, type SetupState } from "@/lib/setup/actions";
import { AssetUploader } from "@/components/setup/AssetUploader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { CheckIcon } from "@/components/ui/icons";

const themes = [
  { id: "classic", label: "Classic", body: "Clean rules, generous space." },
  { id: "bold", label: "Bold", body: "Solid colour header block." },
  { id: "minimal", label: "Minimal", body: "Type-led, almost no lines." },
];

export function BrandingForm({
  logoUrl,
  logoPath,
  signatureUrl,
  signaturePath,
  defaultTheme,
  brandPrimary,
  brandSecondary,
}: {
  businessId: string;
  logoUrl: string | null;
  logoPath: string | null;
  signatureUrl: string | null;
  signaturePath: string | null;
  defaultTheme: string;
  brandPrimary: string | null;
  brandSecondary: string | null;
}) {
  const [state, action] = useActionState<SetupState, FormData>(saveBranding, null);

  return (
    <form action={action} className="space-y-6" noValidate>
      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <AssetUploader kind="logo" initialUrl={logoUrl} initialPath={logoPath} />
      <AssetUploader kind="signature" initialUrl={signatureUrl} initialPath={signaturePath} />

      <fieldset>
        <legend className="mb-2 text-[13.5px] font-medium text-ink">Default document theme</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {themes.map((t) => (
            <label
              key={t.id}
              className="group relative flex cursor-pointer flex-col rounded-xl border border-line bg-surface p-3.5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-[var(--primary-soft)]"
            >
              <input
                type="radio"
                name="default_theme"
                value={t.id}
                defaultChecked={defaultTheme === t.id}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-ink">{t.label}</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-transparent group-has-[:checked]:border-primary group-has-[:checked]:bg-primary group-has-[:checked]:text-[var(--primary-ink)]">
                  <CheckIcon size={10} strokeWidth={3} />
                </span>
              </span>
              <span className="mt-1 text-[12px] leading-snug text-ink-3">{t.body}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="brand_primary" className="mb-1.5 block text-[13.5px] font-medium text-ink">
            Accent colour <span className="text-[12px] font-normal text-ink-3">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="brand_primary"
              name="brand_primary"
              defaultValue={brandPrimary ?? "#FF6D29"}
              className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1"
            />
            <span className="text-[12.5px] text-ink-3">Used for headings and totals on documents.</span>
          </div>
        </div>
        <div>
          <label htmlFor="brand_secondary" className="mb-1.5 block text-[13.5px] font-medium text-ink">
            Secondary colour <span className="text-[12px] font-normal text-ink-3">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="brand_secondary"
              name="brand_secondary"
              defaultValue={brandSecondary ?? "#453027"}
              className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1"
            />
            <span className="text-[12.5px] text-ink-3">Backgrounds and table headers.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center">
        <Link href="/setup/preferences" className="btn btn-ghost flex-1">
          Skip for now
        </Link>
        <div className="flex-1">
          <SubmitButton pendingLabel="Saving…">Continue to preferences</SubmitButton>
        </div>
      </div>
    </form>
  );
}
