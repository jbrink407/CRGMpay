"use client";

import { PaySheetDocument } from "@/components/pay-sheet-document";
import { PaySheetForm } from "@/components/pay-sheet-form";
import { Button } from "@/components/ui/button";
import { STARTER_CODES, ensureCodeIds, type PieceCode } from "@/lib/job-codes";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  createBlankSheet,
  createSampleSheet,
  formatMoney,
  formatUSDate,
  lastWorkedDay,
  nextSunday,
  pdfFilename,
  sundayOfWeek,
  sheetHasWork,
  toISODate,
  weekdayFromIso,
  weeklyTotal,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";
import { downloadPagesPdf } from "@/lib/pdf";
import {
  listWeeks,
  loadCodes,
  loadDraft,
  openOrCreateWeek,
  saveCodes,
  saveDraft,
  type WeekSummary,
} from "@/lib/storage";
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
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const pageRefs = useRef<Partial<Record<Weekday, HTMLDivElement | null>>>({});
  const skipHydrate = useRef(false);

  useEffect(() => {
    const draft = loadDraft();
    const storedCodes = loadCodes();
    const id = window.setTimeout(() => {
      setCodes(ensureCodeIds(storedCodes));
      if (!skipHydrate.current) {
        const next = draft ?? createBlankSheet();
        setSheet(next);
        const today = weekdayFromIso(toISODate(new Date()), next.weekEnding);
        if (today) setDay(today);
      }
      setWeeks(listWeeks());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(() => {
      saveDraft(sheet);
      saveCodes(codes);
      setWeeks(listWeeks());
      setSavedAt(Date.now());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [sheet, codes, ready]);

  function updateSheet(next: PaySheet) {
    skipHydrate.current = true;
    setSheet(next);
  }

  function handleNew() {
    if (
      sheetHasWork(sheet) &&
      !window.confirm(
        "Save this week on this device and start a blank sheet? You can reopen the saved week anytime.",
      )
    ) {
      return;
    }
    saveDraft(sheet);
    const next = openOrCreateWeek(nextSunday(sheet.weekEnding), {
      installerName: sheet.installerName,
      helperName: sheet.helperName,
    });
    updateSheet(next);
    setDay("monday");
    setError(null);
    setNotice(
      `Saved week ending ${formatUSDate(sheet.weekEnding)} and opened week ending ${formatUSDate(next.weekEnding)}. Add lines whenever work happens.`,
    );
  }

  function handleSample() {
    skipHydrate.current = true;
    setCodes(STARTER_CODES);
    const sample = createSampleSheet(STARTER_CODES);
    setSheet(sample);
    setDay("monday");
    setError(null);
    setNotice(
      `Loaded sample for ${sample.installerName} / helper ${sample.helperName}. Weekly total ${formatMoney(weeklyTotal(sample))}.`,
    );
    setTab("preview");
  }

  function handleWeekEnding(raw: string) {
    if (!raw) return;
    const ending = sundayOfWeek(raw);
    if (ending === sheet.weekEnding) return;
    saveDraft(sheet);
    const next = openOrCreateWeek(ending, {
      installerName: sheet.installerName,
      helperName: sheet.helperName,
    });
    updateSheet(next);
    setError(null);
    setNotice(
      next.weekEnding === ending && sheetHasWork(next)
        ? `Opened week ending ${formatUSDate(ending)}. Pick up where you left off.`
        : `Started week ending ${formatUSDate(ending)}. Add a day at a time — it saves on this device.`,
    );
  }

  function handleOpenWeek(weekEnding: string) {
    if (weekEnding === sheet.weekEnding) return;
    saveDraft(sheet);
    updateSheet(
      openOrCreateWeek(weekEnding, {
        installerName: sheet.installerName,
        helperName: sheet.helperName,
      }),
    );
    setError(null);
    setNotice(`Opened week ending ${formatUSDate(weekEnding)}.`);
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
    if (pages.length !== WEEKDAYS.length) {
      setError("Print pages are not ready yet. Try again.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice("Building PDF…");
    try {
      await downloadPagesPdf(pages, pdfFilename(sheet), "landscape");
      setNotice(`Downloaded ${pdfFilename(sheet)} · 7 landscape letter pages`);
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
      <header className="app-chrome sticky top-0 z-20 border-b border-[#d7d0c4] bg-[#ece7de]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-3 px-3 py-2 sm:px-4 sm:py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <img
              src="/construction-resources-logo.png"
              alt="Construction Resources"
              width={659}
              height={656}
              className="h-10 w-auto shrink-0 sm:h-14 md:h-16"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-[0.18em] text-[#e35756] uppercase">
                CRGM Pay
              </p>
              <h1 className="font-heading text-base leading-tight sm:text-lg">
                Payroll detail log
              </h1>
              <p className="mt-0.5 hidden text-xs text-[#6f675c] min-[400px]:block">
                {savedAt
                  ? `Saved on this device · ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                  : ready
                    ? "Saves on this device as you type"
                    : "Loading…"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="max-md:h-11 max-md:flex-1"
              onClick={handleNew}
              disabled={!ready}
            >
              <RotateCcw />
              New week
            </Button>
            <Button
              type="button"
              variant="outline"
              className="max-md:h-11 max-md:flex-1"
              onClick={handleSample}
              disabled={!ready}
            >
              <FileSpreadsheet />
              Load sample
            </Button>
            <Button
              type="button"
              variant="outline"
              className="hidden md:inline-flex"
              onClick={handlePrint}
              disabled={!ready}
            >
              <Printer />
              Print
            </Button>
            <Button
              type="button"
              className="hidden md:inline-flex"
              onClick={handlePdf}
              disabled={busy || !ready}
            >
              <Download />
              {busy ? "Building PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      <div className="app-chrome mx-auto grid max-w-[1700px] gap-4 px-3 py-3 pb-28 md:px-4 md:py-4 md:pb-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,11in)]">
        <div>
          <div className="mb-3 flex gap-1 rounded-lg bg-[#ddd6c8] p-1 xl:hidden">
            <Button
              type="button"
              size="sm"
              className="h-11 flex-1"
              variant={tab === "edit" ? "default" : "ghost"}
              onClick={() => setTab("edit")}
            >
              Enter data
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-11 flex-1"
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
            {ready ? (
              <PaySheetForm
                sheet={sheet}
                codes={codes}
                day={day}
                weeks={weeks}
                onDayChange={setDay}
                onChange={updateSheet}
                onCodesChange={setCodes}
                onWeekEndingChange={handleWeekEnding}
                onOpenWeek={handleOpenWeek}
              />
            ) : (
              <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
                Loading saved week…
              </p>
            )}
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
                  pages={WEEKDAYS.length}
                  showWeeklyTotal={day === lastWorkedDay(sheet)}
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
              pages={WEEKDAYS.length}
              showWeeklyTotal={item === lastWorkedDay(sheet)}
            />
          </div>
        ))}
      </div>

      <div className="app-chrome fixed inset-x-0 bottom-0 z-30 border-t border-[#d7d0c4] bg-[#ece7de]/95 px-3 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-[1700px] gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={handlePrint}
            disabled={!ready}
          >
            <Printer />
            Print
          </Button>
          <Button
            type="button"
            className="h-11 flex-1"
            onClick={handlePdf}
            disabled={busy || !ready}
          >
            <Download />
            {busy ? "Building PDF…" : "Download PDF"}
          </Button>
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
