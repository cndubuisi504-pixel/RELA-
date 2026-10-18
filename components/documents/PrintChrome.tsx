"use client";

import { useEffect } from "react";
import { PrintIcon } from "@/components/ui/icons";

/** Auto-open the print dialog once fonts and images have had a moment to load. skip=embed capture. */
export function PrintTrigger({ skip = false }: { skip?: boolean }) {
  useEffect(() => {
    if (skip) return;
    const timer = setTimeout(() => window.print(), 1200);
    return () => clearTimeout(timer);
  }, [skip]);
  return null;
}

/** Screen-only bar above the sheet: way back, and a manual trigger if auto-print was cancelled. */
export function PrintBar({ label }: { label: string }) {
  return (
    <div className="print-hide sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[860px] items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="min-h-10 rounded-lg px-2 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          ← Back
        </button>
        <span className="num truncate text-[12.5px] text-ink-3">{label}</span>
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
          <PrintIcon size={15} />
          Save as PDF
        </button>
      </div>
    </div>
  );
}
