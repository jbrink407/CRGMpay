"use client";

import { PaySheetDocument } from "@/components/pay-sheet-document";
import { PaySheetForm } from "@/components/pay-sheet-form";
import { Button } from "@/components/ui/button";
import {
  calculate,
  createBlankSheet,
  createSampleSheet,
  formatHoursTotal,
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
import { useEffect, useRef, useState, type ReactNode } from "react";

export function PaySheetApp() {
  const [sheet, setSheet] = useState<PaySheet>(() => createBlankSheet());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const sheetRef = useRef<HTMLDivElement>(null);
  const skipHydrate = useRef(false);

  useEffect(() => {
    if (skipHydrate.current) {
      setReady(true);
      return;
    }
    const draft = loadDraft();
    const company = loadCompany();
    setSheet(draft ?? createBlankSheet(company ?? undefined));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(() => saveDraft(sheet), 250);
    return () => window.clearTimeout(handle);
  }, [sheet, ready]);

  function updateSheet(next: PaySheet) {
    skipHydrate.current = true;
    setSheet(next);
  }

  function handleNew() {
    const company = loadCompany();
    updateSheet(createBlankSheet(company ?? undefined));
    setError(null);
    setNotice("Started a blank sheet. Company name is kept.");
  }

  function handleSample() {
    const sample = createSampleSheet();
    const totals = calculate(sample);
    updateSheet(sample);
    setError(null);
    setNotice(
      `Loaded sample for ${sample.employeeName}: ${sample.jobs.length} jobs, ${formatHoursTotal(totals.totalHours)} hours.`,
    );
    setTab("preview");
  }

  async function handlePdf() {
    if (!sheetRef.current) return;
    if (!sheet.employeeName.trim()) {
      setError("Add an employee name before downloading the PDF.");
      setNotice(null);
      setTab("edit");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice("Building PDF…");
    try {
      await downloadElementPdf(sheetRef.current, pdfFilename(sheet));
      setNotice(`Downloaded ${pdfFilename(sheet)}`);
    } catch (err) {
      setNotice(null);
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
      setNotice(null);
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
            <Button type="button" variant="outline" onClick={handleSample}>
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
          {notice ? (
            <p className="mb-3 rounded-lg bg-[#1c1915]/8 px-3 py-2 text-sm">
              {notice}
            </p>
          ) : null}

          <div className={tab === "edit" ? "block" : "hidden lg:block"}>
            <PaySheetForm sheet={sheet} onChange={updateSheet} />
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
              <FitPreview>
                <PaySheetDocument sheet={sheet} />
              </FitPreview>
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

function FitPreview({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      setScale(Math.min(1, node.clientWidth / 816));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="overflow-hidden">
      <div style={{ height: 1056 * scale }}>
        <div
          style={{
            width: 816,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
