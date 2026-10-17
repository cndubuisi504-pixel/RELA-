"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/ui/icons";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-ghost" aria-live="polite">
      {copied ? (
        <>
          <CheckIcon size={16} strokeWidth={3} className="text-[var(--success)]" />
          Link copied
        </>
      ) : (
        <>Copy verification link</>
      )}
    </button>
  );
}
