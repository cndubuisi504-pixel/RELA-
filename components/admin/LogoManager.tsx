"use client";

import { useActionState, useState } from "react";
import { saveSiteLogo, removeSiteLogo, type SaveLogoState } from "@/lib/admin/actions";
import { RelaMark } from "@/components/branding/Logo";
import { Logo } from "@/components/branding/Logo";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Upload/replace/remove the site logo. A live preview of the *actual* logo
 * (via the same Logo component the site renders) sits next to each surface.
 */
export function LogoManager({ currentUrl }: { currentUrl: string | null }) {
  const [state, action] = useActionState<SaveLogoState, FormData>(saveSiteLogo, null);
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function remove() {
    setRemoving(true);
    const res = await removeSiteLogo();
    setRemoving(false);
    if (!res.ok) alert(res.error ?? "Couldn’t remove the logo. Try again.");
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-[16px] font-medium text-ink">Site logo</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
        Shown in the header, footer and sign-in pages. With nothing uploaded, the default{" "}
        <span className="text-ink">rela.</span> mark is used.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Current — light */}
        <div className="flex min-h-[92px] items-center justify-center gap-3 rounded-xl border border-line bg-white px-4">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="Current site logo" className="max-h-10 w-auto object-contain" />
          ) : (
            <span className="inline-flex items-center gap-2">
              <RelaMark size={24} />
              <span className="text-[21px] font-medium tracking-[-0.045em] text-[#161316]">
                rela<span className="text-[#ff6d29]">.</span>
              </span>
            </span>
          )}
        </div>
        {/* Current — dark */}
        <div className="flex min-h-[92px] items-center justify-center gap-3 rounded-xl border border-line bg-[#161316] px-4">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="max-h-10 w-auto object-contain" />
          ) : (
            <span className="inline-flex items-center gap-2">
              <RelaMark size={24} />
              <span className="text-[21px] font-medium tracking-[-0.045em] text-white">
                rela<span className="text-[#ff6d29]">.</span>
              </span>
            </span>
          )}
        </div>
      </div>

      <form action={action} className="mt-4 space-y-3" onSubmit={() => setSaved(false)}>
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          required
          aria-label="Choose a logo file"
          className="block w-full cursor-pointer text-[13px] text-ink-2 file:mr-3 file:min-h-10 file:rounded-full file:border file:border-line file:bg-surface-2 file:px-4 file:text-[13px] file:font-medium file:text-ink hover:file:bg-surface-3"
        />
        <p className="text-[12px] text-ink-3">PNG, JPG or WebP · up to 2 MB</p>
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && !saved && (
          <Alert tone="success">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon size={14} strokeWidth={3} /> Logo updated — it’s live everywhere now.
            </span>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingLabel="Uploading…" className="btn btn-primary btn-sm">Upload logo</SubmitButton>
          {currentUrl && (
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className="btn btn-ghost btn-sm"
            >
              {removing ? "Removing…" : "Remove logo"}
            </button>
          )}
        </div>
      </form>

      <p className="mt-4 text-[12px] text-ink-3">
        Preview with the real lockup: <Logo href={null} markSize={18} textClassName="text-[16px]" />
      </p>
    </section>
  );
}
