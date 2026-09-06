"use client";

import { PaySheetDocument } from "@/components/pay-sheet-document";
import { PaySheetForm } from "@/components/pay-sheet-form";
import { Button } from "@/components/ui/button";
import { STARTER_CODES, type PieceCode } from "@/lib/job-codes";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  createBlankSheet,
  createSampleSheet,
  formatMoney,
  pdfFilename,
  weeklyTotal,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";
import { downloadPagesPdf } from "@/lib/pdf";
import { loadCodes, loadDraft, saveCodes, saveDraft } from "@/lib/storage";
import {
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function PaySheetApp() {
  const [sheet, setSheet] = useState<PaySheet>(() => createBlankSheet());
  const [codes, setCodes] = useState<PieceCode[]>(STARTER_CODES);
  const [day, setDay] = useState<Weekday>("monday");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const pageRefs = useRef<Record<Weekday, HTMLDivElement | null>>({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
  });
  const skipHydrate = useRef(false);

  useEffect(() => {
    if (skipHydrate.current) {
      setReady(true);
      return;
    }
    const draft = loadDraft();
    setCodes(loadCodes());
    setSheet(draft ?? createBlankSheet());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(() => {
      saveDraft(sheet);
      saveCodes(codes);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [sheet, codes, ready]);

  function updateSheet(next: PaySheet) {
    skipHydrate.current = true;
    setSheet(next);
  }

  function handleNew() {
    updateSheet(createBlankSheet());
    setDay("monday");
    setError(null);
    setNotice("Started a blank week.");
  }

  function handleSample() {
    const sample = createSampleSheet(codes);
    updateSheet(sample);
    setDay("monday");
    setError(null);
    setNotice(
      `Loaded sample for ${sample.installerName} / helper ${sample.helperName}. Weekly total ${formatMoney(weeklyTotal(sample))}.`,
    );
    setTab("preview");
  }

  async function handlePdf() {
    if (!sheet.installerName.trim()) {
      setError("Add an installer name before downloading the PDF.");
      setNotice(null);
      setTab("edit");
      return;
    }
    const pages = WEEKDAYS.map((item) => pageRefs.current[item]).filter(
      (node): node is HTMLDivElement => Boolean(node),
    );
    if (pages.length !== 5) {
      setError("Print pages are not ready yet. Try again.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice("Building PDF…");
    try {
      await downloadPagesPdf(pages, pdfFilename(sheet), "landscape");
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
    if (!sheet.installerName.trim()) {
      setError("Add an installer name before printing.");
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
        <div className="mx-auto flex max-w-[1700px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-[#6f675c] uppercase">
              CRGM Pay
            </p>
            <h1 className="font-heading text-lg leading-tight">
              Payroll detail log
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleNew}>
              <RotateCcw />
              New week
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

      <div className="app-chrome mx-auto grid max-w-[1700px] gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,11in)]">
        <div>
          <div className="mb-3 flex gap-1 rounded-lg bg-[#ddd6c8] p-1 xl:hidden">
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

          <div className={tab === "edit" ? "block" : "hidden xl:block"}>
            <PaySheetForm
              sheet={sheet}
              codes={codes}
              day={day}
              onDayChange={setDay}
              onChange={updateSheet}
              onCodesChange={setCodes}
            />
          </div>
        </div>

        <aside className={`${tab === "preview" ? "block" : "hidden"} xl:block`}>
          <div className="xl:sticky xl:top-20">
            <p className="mb-2 hidden text-xs tracking-wide text-[#6f675c] uppercase xl:block">
              Print preview · {WEEKDAY_LABELS[day]}
            </p>
            <div className="sheet-scroll overflow-auto rounded-xl bg-[#cfc6b6] p-2 shadow-inner xl:max-h-[calc(100vh-7rem)]">
              <FitPreview>
                <PaySheetDocument
                  sheet={sheet}
                  day={day}
                  page={WEEKDAYS.indexOf(day) + 1}
                  pages={5}
                  showWeeklyTotal={day === "friday"}
                />
              </FitPreview>
            </div>
          </div>
        </aside>
      </div>

      <div className="print-only">
        {WEEKDAYS.map((item, index) => (
          <div
            key={item}
            ref={(node) => {
              pageRefs.current[item] = node;
            }}
            className="print-page"
          >
            <PaySheetDocument
              sheet={sheet}
              day={item}
              page={index + 1}
              pages={5}
              showWeeklyTotal={item === "friday"}
            />
          </div>
        ))}
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
      setScale(Math.min(1, node.clientWidth / 1056));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="overflow-hidden">
      <div style={{ height: 816 * scale }}>
        <div
          style={{
            width: 1056,
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
