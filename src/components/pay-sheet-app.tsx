"use client";

import { PaySheetDocument } from "@/components/pay-sheet-document";
import { PaySheetForm } from "@/components/pay-sheet-form";
import { Button } from "@/components/ui/button";
import {
  createBlankSheet,
  createSampleSheet,
  pdfFilename,
  type PaySheet,
} from "@/lib/pay-sheet";
import { downloadElementPdf } from "@/lib/pdf";
import { loadCompany, loadDraft, saveDraft } from "@/lib/storage";
import {
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PaySheetApp() {
  const [sheet, setSheet] = useState<PaySheet>(() => createBlankSheet());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draft = loadDraft();
    const company = loadCompany();
    // Restore after mount so the server render stays blank and hydration matches.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setSheet(draft ?? createBlankSheet(company ?? undefined));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(() => saveDraft(sheet), 250);
    return () => window.clearTimeout(handle);
  }, [sheet, ready]);

  function handleNew() {
    const company = loadCompany();
    setSheet(createBlankSheet(company ?? undefined));
    setError(null);
  }

  async function handlePdf() {
    if (!sheetRef.current) return;
    if (!sheet.employeeName.trim()) {
      setError("Add an employee name before downloading the PDF.");
      setTab("edit");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await downloadElementPdf(sheetRef.current, pdfFilename(sheet));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not build the PDF. Try Print instead.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handlePrint() {
    if (!sheet.employeeName.trim()) {
      setError("Add an employee name before printing.");
      setTab("edit");
      return;
    }
    setError(null);
    window.print();
  }

  return (
    <div className="min-h-full bg-[#ece7de] text-[#1c1915]">
      <header className="app-chrome sticky top-0 z-20 border-b border-[#d7d0c4] bg-[#ece7de]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-[#6f675c] uppercase">
              CRGM Pay
            </p>
            <h1 className="font-heading text-lg leading-tight">
              Corporate pay sheet
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleNew}>
              <RotateCcw />
              New sheet
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSheet(createSampleSheet());
                setError(null);
              }}
            >
              <FileSpreadsheet />
              Load sample
            </Button>
            <Button type="button" variant="outline" onClick={handlePrint}>
              <Printer />
              Print
            </Button>
            <Button type="button" onClick={handlePdf} disabled={busy}>
              <Download />
              {busy ? "Building PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      <div className="app-chrome mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)] xl:grid-cols-[minmax(0,1fr)_8.5in]">
        <div>
          <div className="mb-3 flex gap-1 rounded-lg bg-[#ddd6c8] p-1 lg:hidden">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              variant={tab === "edit" ? "default" : "ghost"}
              onClick={() => setTab("edit")}
            >
              Enter data
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              variant={tab === "preview" ? "default" : "ghost"}
              onClick={() => setTab("preview")}
            >
              Preview
            </Button>
          </div>

          {error ? (
            <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className={tab === "edit" ? "block" : "hidden lg:block"}>
            <PaySheetForm sheet={sheet} onChange={setSheet} />
          </div>
        </div>

        <aside
          className={`${tab === "preview" ? "block" : "hidden"} lg:block`}
        >
          <div className="lg:sticky lg:top-20">
            <p className="mb-2 hidden text-xs tracking-wide text-[#6f675c] uppercase lg:block">
              Print preview
            </p>
            <div className="sheet-scroll overflow-auto rounded-xl bg-[#cfc6b6] p-2 shadow-inner lg:max-h-[calc(100vh-7rem)]">
              <PaySheetDocument sheet={sheet} />
            </div>
          </div>
        </aside>
      </div>

      <div className="print-only">
        <div ref={sheetRef} id="pay-sheet">
          <PaySheetDocument sheet={sheet} />
        </div>
      </div>
    </div>
  );
}
