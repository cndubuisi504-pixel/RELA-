"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckIcon, CloseIcon, PrintIcon, WhatsAppIcon } from "@/components/ui/icons";

type Props = {
  documentNumber: string;
  label: string; // "Receipt" | "Invoice" | "Quotation"
  publicUrl: string;
  printUrl: string; // /documents/[id]/print — last-resort phone print flow
};

type Note = { tone: "ok" | "info" | "error"; text: string } | null;

/**
 * Two actions, honest about how phones actually work:
 *   1. Save PDF  — builds the real A4 document on-device and saves the file.
 *      WhatsApp attach happens through the phone's own 📎 (reliable everywhere).
 *   2. Copy link — the customer's live verification page.
 */
export function ShareSheet({ documentNumber, label, publicUrl, printUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<Note>(null);

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

  /* PDF from the hidden in-page print sheet (no popup — phones can't block it). */
  async function buildPdf(): Promise<File> {
    const html2pdf = (await import("html2pdf.js")).default;
    const host = document.getElementById("pdf-capture-root");
    if (!host) throw new Error("capture-target-missing");

    const prevClass = host.className;
    const veil = document.createElement("div");
    veil.className = "pdf-capture-veil";
    veil.innerHTML = `<div class="pdf-capture-spinner" role="status">Preparing your PDF…</div>`;
    try {
      host.removeAttribute("aria-hidden");
      host.className = "pdf-capture-host";
      host.appendChild(veil);

      try {
        await Promise.race([
          (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve(),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
      } catch {
        /* fonts API unavailable — capture anyway */
      }
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))),
      );

      const target = host.querySelector<HTMLElement>(".print-sheet");
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
      veil.remove();
      host.className = prevClass || "hidden";
      host.setAttribute("aria-hidden", "true");
    }
  }

  async function savePdf() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const file = await buildPdf();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNote({
        tone: "info",
        text: `Saved to your downloads. In WhatsApp, tap 📎 → Document (or Gallery/Files) and pick ${file.name}.`,
      });
    } catch {
      setNote({
        tone: "error",
        text: "That didn’t save — use “open the print page” below instead; it always works.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = publicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setNote({
      tone: "ok",
      text: "Link copied — paste it in WhatsApp, Instagram DM, anywhere.",
    });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <button
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
                  Save the PDF, then attach it in WhatsApp 📎 — or simply send the link.
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
              {/* 1 — primary: save the PDF to the phone */}
              <button
                type="button"
                onClick={savePdf}
                disabled={busy}
                className="btn w-full justify-start gap-3 border border-[color:#21c06333] bg-[#21c063] px-4 text-white hover:bg-[#1db25b] disabled:opacity-60"
              >
                <PrintIcon size={19} />
                <span className="flex flex-col items-start">
                  <span className="text-[15px] font-semibold">
                    {busy ? "Preparing your PDF…" : "Save PDF"}
                  </span>
                  {!busy && (
                    <span className="text-[11.5px] font-normal opacity-90">
                      Downloads to your phone — attach it in WhatsApp with 📎
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
                    Your customer can open and verify this {label.toLowerCase()} anywhere
                  </span>
                </span>
              </button>
            </div>

            <p className="mt-3 text-center text-[11.5px] text-ink-3">
              Trouble saving?{" "}
              <Link href={printUrl} onClick={close} className="text-[var(--accent-text)] underline underline-offset-2">
                open the print page
              </Link>{" "}
              and use your phone’s print → PDF.
            </p>

            {note && (
              <p
                role="status"
                className={[
                  "mt-3 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed",
                  note.tone === "ok" &&
                    "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]",
                  note.tone === "info" && "border-line bg-[var(--key-bg)] text-ink-2",
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

function LinkIconGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
