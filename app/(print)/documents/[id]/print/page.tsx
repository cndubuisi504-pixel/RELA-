import type { Metadata } from "next";
import { loadPrintData } from "@/lib/documents/print-data";
import { PrintBar, PrintTrigger } from "@/components/documents/PrintChrome";
import { PrintSheetView } from "@/components/documents/PrintSheetView";
import { typeMeta } from "@/lib/documents/status";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Save as PDF · rela.",
  robots: { index: false, follow: false },
};

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const skipAuto = (await searchParams)?.noprint === "1";
  const { doc, items, business, watermark } = await loadPrintData(id);

  const meta = typeMeta[doc.document_type];
  const publicUrl = `${site.url}/r/${doc.public_token}`;

  return (
    <div className="print-root">
      <PrintBar label={`${meta.label} · ${doc.document_number}`} />
      <PrintTrigger skip={skipAuto} />

      <div className="print-canvas">
          <PrintSheetView
            doc={doc}
            items={items}
            business={business}
            publicUrl={publicUrl}
            watermark={watermark}
          />
      </div>

      <p className="print-hide mx-auto max-w-[794px] px-4 pb-10 text-center text-[12px] text-ink-3">
        In the print dialog, choose <strong>Save as PDF</strong>. Layout is A4; the dialog opens
        automatically.
      </p>
    </div>
  );
}
