"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CloseIcon,
  PrintIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";

type Props = {
  documentNumber: string;
  label: string; // "Receipt" | "Invoice" | "Quotation"
  publicUrl: string;
  waCaption: string; // plain-text caption (short summary + public link)
  waFallbackHref: string; // wa.me link (customer-targeted when a phone exists)
  printUrl: string; // /documents/[id]/print (browser save-as-pdf route)
  printFrameUrl: string; // same, with ?noprint=1 for the capture iframe
};

type Note = { tone: "ok" | "warn" | "error"; text: string } | null;

/**
 * One Share button -> bottom sheet. The four actions (WhatsApp PDF, copy link,
 * open public page, save as PDF) live inside so the document page stops
 * showing a wall of buttons.
 */
export function ShareSheet({
  documentNumber,
  label,
  publicUrl,
  waCaption,
  waFallbackHref,
  printUrl,
  printFrameUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [openWaHref, setOpenWaHref] = useState<string | null>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  /* ---------- modal hygiene ---------- */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
    setNote(null);
  }, []);

  /* ---------- PDF built from the real print sheet ----------
     Framing is DENYed app-wide (clickjacking), so the print sheet renders in a
     small same-origin popup, gets captured, then closes. The popup opens only
     from this user gesture. */
  async function buildPdf(): Promise<File> {
    const html2pdf = (await import("html2pdf.js")).default;
    const win = window.open(
      printFrameUrl,
      "rela-print-capture",
      "popup=yes,width=820,height=1160,left=9000,top=0",
    );
    if (!win) throw new Error("popup-blocked");
    try {
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          setTimeout(resolve, 1300); // fonts + images settle before capture
        };
        win.addEventListener("load", finish, { once: true });
        setTimeout(finish, 6000); // hard cap — never hang on a broken window
      });
      const target = win.document.querySelector<HTMLElement>(".print-sheet");
      if (!target) throw new Error("print-sheet-missing");
      const blob: Blob = await html2pdf()
        .set({
          margin: 10,
          filename: `${documentNumber}.pdf`,
          image: { type: "jpeg", quality: 0.94 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: 794,
            logging: false,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(target)
        .outputPdf("blob");
      return new File([blob], `${documentNumber}.pdf`, { type: "application/pdf" });
    } finally {
      win.close();
    }
  }

  /* ---------- actions ---------- */
  async function sharePdfOnWhatsApp() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const file = await buildPdf();
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: ShareData & { files?: File[] }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({
            files: [file],
            title: `${label} ${documentNumber}`,
            text: waCaption,
          });
          close();
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return; // user backed out of the picker
          throw err;
        }
      }
      // No native file sharing (desktop browsers, older phones):
      // hand the PDF over as a download, then open WhatsApp with the caption texted.
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      // A second window.open after async work gets popup-blocked on most
      // browsers — surface a real button instead (the tap is a fresh gesture).
      setOpenWaHref(waFallbackHref);
      setNote({
        tone: "warn",
        text: `PDF saved to downloads — this browser can't attach files to WhatsApp directly. Tap “Open WhatsApp”, then attach the PDF with the 📎 button in the chat.`,
      });
    } catch {
      setNote({
        tone: "error",
        text: "Couldn't build the PDF just now. “Save as PDF” below uses your phone's own print system and always works.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      // Clipboard API blocked (rare, insecure context): select-and-copy fallback.
      const ta = document.createElement("textarea");
      ta.value = publicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setNote({ tone: "ok", text: "Link copied — paste it anywhere (WhatsApp, Instagram DM, email)." });
    setTimeout(() => setCopied(false), 2500);
  }

  /* ---------- render ---------- */
  return (
    <>
      <button
        ref={openRef}
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
        aria-haspopup="dialog"
      >
        <WhatsAppIcon size={17} />
        Share {label.toLowerCase()}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Share ${label} ${documentNumber}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(18,20,23,0.55)] p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-[440px] rounded-t-[22px] border border-line bg-surface p-5 pb-7 shadow-[var(--shadow-2)] sm:rounded-[22px] sm:pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[17px] font-semibold text-ink">
                  Share {label.toLowerCase()} {documentNumber}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {label === "Receipt"
                    ? "Send proof of payment to your customer."
                    : "Send this to your customer — the link lets them verify it."}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-ink-3 hover:bg-[var(--key-bg)] hover:text-ink"
              >
                <CloseIcon size={17} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {/* 1 — primary: PDF over WhatsApp */}
              <button
                type="button"
                onClick={sharePdfOnWhatsApp}
                disabled={busy}
                className="btn w-full justify-start gap-3 border border-[color:#21c06333] bg-[#21c063] px-4 text-white hover:bg-[#1db25b] disabled:opacity-60"
              >
                <WhatsAppIcon size={19} />
                <span className="flex flex-col items-start">
                  <span className="text-[15px] font-semibold">
                    {busy ? "Preparing your PDF…" : "Share PDF on WhatsApp"}
                  </span>
                  {!busy && (
                    <span className="text-[11.5px] font-normal opacity-90">
                      Attaches the real PDF — customer just taps download
                    </span>
                  )}
                </span>
              </button>

              {/* 2 — copy link */}
              <button
                type="button"
                onClick={copyLink}
                className="btn btn-ghost w-full justify-start gap-3"
              >
                {copied ? <CheckIcon size={17} strokeWidth={3} /> : <LinkIconGlyph />}
                <span className="flex flex-col items-start">
                  <span className="text-[15px] font-medium">
                    {copied ? "Copied!" : "Copy public link"}
                  </span>
                  <span className="text-[11.5px] font-normal text-ink-3">
                    For Instagram DMs, email, anywhere else
                  </span>
                </span>
              </button>

              {/* 3 — open public page */}
              <Link
                href={publicUrl}
                target="_blank"
                onClick={close}
                className="btn btn-ghost w-full justify-start gap-3"
              >
                <OpenExternalGlyph />
                <span className="flex flex-col items-start">
                  <span className="text-[15px] font-medium">Open public page</span>
                  <span className="text-[11.5px] font-normal text-ink-3">
                    See exactly what your customer sees
                  </span>
                </span>
              </Link>

              {/* 4 — save / print */}
              <Link
                href={printUrl}
                onClick={close}
                className="btn btn-ghost w-full justify-start gap-3"
              >
                <PrintIcon size={16} />
                <span className="flex flex-col items-start">
                  <span className="text-[15px] font-medium">Save as PDF</span>
                  <span className="text-[11.5px] font-normal text-ink-3">
                    Uses your phone's print — good for saving to Files or printing
                  </span>
                </span>
              </Link>
            </div>

            {openWaHref && (
              <a
                href={openWaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn mt-2.5 w-full justify-start gap-3 border border-[color:#21c06355] bg-[#21c06322] text-[#128c4a]"
              >
                <WhatsAppIcon size={17} />
                Open WhatsApp with the link texted
              </a>
            )}

            {note && (
              <p
                role="status"
                className={[
                  "mt-3 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed",
                  note.tone === "ok" &&
                    "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]",
                  note.tone === "warn" &&
                    "border-line bg-[var(--key-bg)] text-ink-2",
                  note.tone === "error" &&
                    "border-[var(--danger-border,#f2c1c1)] bg-[var(--danger-bg,#fdeeee)] text-[var(--danger,#b3261e)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {note.text}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* Small inline glyphs for actions that have no library icon. */
function LinkIconGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function OpenExternalGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
