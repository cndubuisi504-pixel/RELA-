"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveUploadedAsset } from "@/lib/setup/actions";
import { pathFromBrandingUrl } from "@/lib/branding/url";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";

type Kind = "logo" | "signature";
type Phase = "empty" | "validating" | "uploading" | "done" | "error";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function AssetUploader({
  kind,
  initialUrl,
  initialPath,
}: {
  kind: Kind;
  initialUrl?: string | null;
  initialPath?: string | null;
}) {
  const isLogo = kind === "logo";
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>(initialUrl ? "done" : "empty");
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [storedPath, setStoredPath] = useState<string | null>(
    initialPath ?? (initialUrl ? pathFromBrandingUrl(initialUrl) : null),
  );
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setPhase("error");
        setError("That file type isn’t supported. Use a PNG, JPG or WebP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setPhase("error");
        setError("That file is larger than 2 MB. Try a smaller version.");
        return;
      }

      setPhase("validating");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPhase("error");
        setError("Your session expired. Refresh the page and try again.");
        return;
      }

      const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
      const path = `${user.id}/${kind}-${Date.now()}.${ext}`;

      setPhase("uploading");
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

      if (uploadError) {
        setPhase("error");
        setError(
          uploadError.message.toLowerCase().includes("bucket")
            ? "Storage isn’t set up yet. Contact support and we’ll fix it."
            : "The upload didn’t go through. Check your connection and retry.",
        );
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("branding").getPublicUrl(path);

      const saved = await saveUploadedAsset(kind, publicUrl);
      if (!saved.ok) {
        setPhase("error");
        setError(saved.error ?? "Uploaded, but we couldn’t attach it. Try again.");
        return;
      }

      // Remove the previous file so the bucket doesn't fill with orphans.
      if (storedPath) {
        await supabase.storage.from("branding").remove([storedPath]);
      }

      setUrl(publicUrl);
      setStoredPath(path);
      setPhase("done");
    },
    [kind, storedPath],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  async function remove() {
    if (removing) return;
    setRemoving(true);
    const toRemove = storedPath;
    const prevUrl = url;
    const prevPath = storedPath;

    setPhase("empty");
    setUrl(null);
    setError(null);
    setStoredPath(null);

    try {
      if (toRemove) {
        const supabase = createClient();
        await supabase.storage.from("branding").remove([toRemove]);
      }
      const saved = await saveUploadedAsset(kind, "");
      if (!saved.ok) {
        setError(saved.error ?? "Couldn’t remove asset. Try again.");
        setUrl(prevUrl);
        setStoredPath(prevPath);
        setPhase("done");
      }
    } catch {
      setError("Couldn’t remove asset. Check connection and retry.");
      setUrl(prevUrl);
      setStoredPath(prevPath);
      setPhase("done");
    } finally {
      setRemoving(false);
    }
  }

  const busy = phase === "validating" || phase === "uploading";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13.5px] font-medium text-ink">
          {isLogo ? "Business logo" : "Signature"}
          {!isLogo && <span className="ml-1 text-[12px] font-normal text-ink-3">(optional)</span>}
        </label>
        {phase === "done" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-11 rounded-lg px-2 text-[12.5px] font-medium text-[var(--accent-text)] hover:underline"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={removing}
              className="min-h-11 rounded-lg px-2 text-[12.5px] text-ink-3 hover:text-[var(--danger)] disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
        aria-label={isLogo ? "Upload business logo" : "Upload signature image"}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "relative mt-2 overflow-hidden rounded-2xl border p-4 backdrop-blur-[18px] transition-colors",
          "bg-[rgba(255,255,255,0.62)] dark:bg-[rgba(44,44,46,0.68)]",
          dragging
            ? "border-primary ring-2 ring-primary/30"
            : "border-[rgba(255,255,255,0.75)] dark:border-[rgba(255,255,255,0.12)]",
        ].join(" ")}
      >
        {phase === "empty" || phase === "error" ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl px-3 py-7 text-center"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-2">
              <PlusIcon size={19} />
            </span>
            <span className="text-[14px] font-medium text-ink">
              {isLogo ? "Tap to upload your logo" : "Tap to upload a signature"}
            </span>
            <span className="text-[12px] text-ink-3">
              PNG, JPG or WebP · up to 2 MB{isLogo ? " · drag and drop on desktop" : ""}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white",
                isLogo ? "h-16 w-16" : "h-14 w-28",
              ].join(" ")}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={isLogo ? "Your uploaded business logo" : "Your uploaded signature"}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              {busy ? (
                <>
                  <p className="text-[13.5px] font-medium text-ink">
                    {phase === "validating" ? "Checking the file…" : "Uploading…"}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: phase === "validating" ? "20%" : "75%",
                        transition: "width 600ms ease",
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[13.5px] font-medium text-[var(--success)]">Uploaded</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {isLogo ? "Shown at the top of your documents." : "Appears above your signature line."}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-3 py-2.5">
            <p className="text-[12.5px] leading-snug text-[var(--danger)]">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("empty");
              }}
              className="shrink-0 rounded-md p-1 text-[var(--danger)] hover:opacity-70"
              aria-label="Dismiss error"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {isLogo && (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
          Your logo is separate from the Rela mark and never replaces it.
        </p>
      )}
    </div>
  );
}
