"use client";

import { AssetUploader } from "@/components/setup/AssetUploader";

export function BrandingSettingsCard({
  logoUrl,
  logoPath,
  signatureUrl,
  signaturePath,
}: {
  logoUrl?: string | null;
  logoPath?: string | null;
  signatureUrl?: string | null;
  signaturePath?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-[14px] font-medium text-ink">Business logo &amp; signature</h2>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">
        Your logo appears at the top of your documents and public customer links. Your signature
        appears above the signature line.
      </p>
      <div className="mt-4 space-y-5">
        <AssetUploader
          kind="logo"
          initialUrl={logoUrl}
          initialPath={logoPath}
        />
        <AssetUploader
          kind="signature"
          initialUrl={signatureUrl}
          initialPath={signaturePath}
        />
      </div>
    </section>
  );
}
