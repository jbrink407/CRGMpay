"use client";

import { PaySheetDocument } from "@/components/pay-sheet-document";
import { PaySheetForm } from "@/components/pay-sheet-form";
import { AuthBar } from "@/components/auth-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STARTER_CODES, ensureCodeIds, type PieceCode } from "@/lib/job-codes";
import {
  STARTER_CUSTOMERS,
  ensureCustomerIds,
  rememberCustomer,
  type Customer,
} from "@/lib/customers";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  createBlankSheet,
  createSampleSheet,
  formatMoney,
  formatUSDate,
  lastWorkedDay,
  nextSunday,
  packetDays,
  pdfFilename,
  printDays,
  sheetPage,
  sundayOfWeek,
  sheetHasWork,
  toISODate,
  weekdayFromIso,
  weeklyTotal,
  type PaySheet,
  type PacketScope,
  type Weekday,
} from "@/lib/pay-sheet";
import { downloadPagesPdf } from "@/lib/pdf";
import {
  applySnapshot,
  deleteWeek,
  listWeeks,
  loadCodes,
  loadCustomers,
  loadDraft,
  loadSnapshot,
  openOrCreateWeek,
  saveCodes,
  saveCustomers,
  saveDraft,
  snapshotCurrentSheet,
  type WeekSummary,
} from "@/lib/storage";
import {
  cloudErrorMessage,
  mergeSnapshots,
  pullRemoteSnapshot,
  pushRemoteSnapshot,
} from "@/lib/sync";
import { isCloudConfigured } from "@/lib/supabase";
import { cn } from "cn";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

export function PaySheetApp() {
  const [sheet, setSheet] = useState<PaySheet>(() => createBlankSheet());
  const [codes, setCodes] = useState<PieceCode[]>(STARTER_CODES);
  const [customers, setCustomers] = useState<Customer[]>(STARTER_CUSTOMERS);
  const [day, setDay] = useState<Weekday>("monday");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [syncTick, setSyncTick] = useState(0);
  const pageRefs = useRef<Partial<Record<Weekday, HTMLDivElement | null>>>({});
  const dayPdfRef = useRef<HTMLDivElement | null>(null);
  const skipHydrate = useRef(false);
  const sheetRef = useRef(sheet);
  const codesRef = useRef(codes);
  const customersRef = useRef(customers);
  const lastPushed = useRef("");
  const seenAuth = useRef(false);
  const previousUserId = useRef<string | undefined>(undefined);
  const allowCloudPush = useRef(false);
  sheetRef.current = sheet;
  codesRef.current = codes;
  customersRef.current = customers;

  useEffect(() => {
    const draft = loadDraft();
    const storedCodes = loadCodes();
    const storedCustomers = loadCustomers();
    const id = window.setTimeout(() => {
      setCodes(ensureCodeIds(storedCodes));
      setCustomers(ensureCustomerIds(storedCustomers));
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
      saveCustomers(customers);
      setWeeks(listWeeks());
      setSavedAt(Date.now());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [sheet, codes, customers, ready, syncTick]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!ready || !userId || !isCloudConfigured()) {
      if (!userId) {
        setSyncStatus("idle");
        lastPushed.current = "";
        allowCloudPush.current = false;
        seenAuth.current = true;
        previousUserId.current = undefined;
      }
      return;
    }
    const justSignedIn = seenAuth.current && previousUserId.current !== userId;
    seenAuth.current = true;
    previousUserId.current = userId;
    allowCloudPush.current = false;
    let cancelled = false;
    setSyncStatus("syncing");
    void (async () => {
      try {
        const remote = await pullRemoteSnapshot(userId);
        if (cancelled) return;
        saveDraft(sheetRef.current);
        saveCodes(codesRef.current);
        saveCustomers(customersRef.current);
        const local = loadSnapshot();
        const merged = remote ? mergeSnapshots(local, remote) : local;
        applySnapshot(merged);
        await pushRemoteSnapshot(userId, merged);
        if (cancelled) return;
        lastPushed.current = JSON.stringify(merged);
        allowCloudPush.current = true;
        const nextSheet = snapshotCurrentSheet(merged) ?? createBlankSheet();
        skipHydrate.current = true;
        setCodes(merged.codes);
        setCustomers(merged.customers);
        setSheet(nextSheet);
        setWeeks(listWeeks());
        setSavedAt(Date.now());
        setSyncStatus("synced");
        if (justSignedIn) {
          setNotice("Signed in. Weeks, builders, and job codes sync to this account.");
        }
      } catch (err) {
        if (cancelled) return;
        setSyncStatus("error");
        setError(cloudErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!ready || !userId || !isCloudConfigured()) return;
    const handle = window.setTimeout(() => {
      if (!allowCloudPush.current) return;
      const snapshot = loadSnapshot();
      const json = JSON.stringify(snapshot);
      if (json === lastPushed.current) return;
      setSyncStatus((current) => (current === "error" ? current : "syncing"));
      void pushRemoteSnapshot(userId, snapshot)
        .then(() => {
          lastPushed.current = json;
          setSyncStatus("synced");
          setSavedAt(Date.now());
        })
        .catch((err: unknown) => {
          setSyncStatus("error");
          setError(cloudErrorMessage(err));
        });
    }, 1600);
    return () => window.clearTimeout(handle);
  }, [sheet, codes, customers, ready, session?.user.id, syncTick]);

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
    setCustomers((current) =>
      ["Henderson", "Westfield Apts", "St. Marks"].reduce(
        (list, name) => rememberCustomer(list, name),
        current,
      ),
    );
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

  function handleDeleteWeek(weekEnding: string) {
    const label = formatUSDate(weekEnding);
    if (
      !window.confirm(
        `Remove week ending ${label} from this device? This cannot be undone.`,
      )
    ) {
      return;
    }
    const deletingCurrent = weekEnding === sheet.weekEnding;
    const remaining = deleteWeek(weekEnding);
    if (deletingCurrent) {
      const next = loadDraft() ?? createBlankSheet();
      updateSheet({
        ...next,
        installerName: next.installerName || sheet.installerName,
        helperName: next.helperName || sheet.helperName,
      });
      setDay("monday");
    }
    setWeeks(remaining);
    setSyncTick((value) => value + 1);
    setError(null);
    setNotice(`Removed week ending ${label} from this device.`);
  }

  async function handlePdf(scope: PacketScope) {
    if (!sheet.installerName.trim()) {
      setError("Add an installer name before downloading the PDF.");
      setNotice(null);
      setTab("edit");
      return;
    }
    const days = packetDays(sheet, day, scope);
    const pages =
      scope === "day"
        ? dayPdfRef.current
          ? [dayPdfRef.current]
          : []
        : days
            .map((item) => pageRefs.current[item])
            .filter((node): node is HTMLDivElement => Boolean(node));
    if (pages.length !== days.length) {
      setError("Print pages are not ready yet. Try again.");
      return;
    }
    const filename = pdfFilename(sheet, scope === "day" ? day : undefined);
    setBusy(true);
    setError(null);
    setNotice("Building PDF…");
    try {
      await downloadPagesPdf(pages, filename, "landscape");
      const count = pages.length;
      setNotice(
        scope === "day"
          ? `Downloaded ${filename} · ${WEEKDAY_LABELS[day]} only`
          : `Downloaded ${filename} · ${count} landscape letter page${count === 1 ? "" : "s"}`,
      );
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

  const packet = printDays(sheet, day);
  const paging = sheetPage(sheet, day, day);

  return (
    <div className="min-h-full min-w-0 overflow-x-clip bg-[#ece7de] text-[#1c1915]">
      <header className="app-chrome sticky top-0 z-20 border-b border-[#d7d0c4] bg-[#ece7de]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                CR Pay
              </p>
              <h1 className="font-heading text-base leading-tight sm:text-lg">
                Payroll detail log
              </h1>
              <p className="mt-0.5 hidden text-xs text-[#6f675c] min-[400px]:block">
                {saveStatusLabel(ready, savedAt, session, syncStatus)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AuthBar onSessionChange={setSession} />
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
            <PdfMenu
              busy={busy}
              ready={ready}
              day={day}
              weekPages={packet.length}
              className="hidden md:inline-flex"
              onPick={handlePdf}
            />
          </div>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-lg bg-[#ddd6c8] p-1 xl:hidden">
            <Button
              type="button"
              size="sm"
              className="h-11 min-w-0 w-full"
              variant={tab === "edit" ? "default" : "ghost"}
              onClick={() => setTab("edit")}
            >
              Enter data
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-11 min-w-0 w-full"
              variant={tab === "preview" ? "default" : "ghost"}
              onClick={() => setTab("preview")}
            >
              Preview
            </Button>
          </div>
        </div>
      </header>

      <div className="app-chrome mx-auto grid w-full min-w-0 max-w-[1700px] grid-cols-1 gap-4 px-3 py-3 pb-28 md:px-4 md:py-4 md:pb-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,11in)]">
        <div className="min-w-0">
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
                customers={customers}
                onCustomersChange={setCustomers}
                onWeekEndingChange={handleWeekEnding}
                onOpenWeek={handleOpenWeek}
                onDeleteWeek={handleDeleteWeek}
              />
            ) : (
              <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
                Loading saved week…
              </p>
            )}
          </div>
        </div>

        <aside
          className={`min-w-0 w-full max-w-full overflow-hidden ${tab === "preview" ? "block" : "hidden"} xl:block`}
        >
          <div className="min-w-0 xl:sticky xl:top-20">
            <p className="mb-2 hidden text-xs tracking-wide text-[#6f675c] uppercase xl:block">
              Print preview · {WEEKDAY_LABELS[day]}
              {paging.page
                ? ` · page ${paging.page} of ${paging.pages}`
                : ` · not in this week’s ${paging.pages}-page packet`}
            </p>
            <div className="sheet-scroll min-w-0 overflow-hidden rounded-xl bg-[#cfc6b6] p-2 shadow-inner xl:max-h-[calc(100vh-7rem)] xl:overflow-auto">
              <FitPreview active={tab === "preview"}>
                <PaySheetDocument
                  sheet={sheet}
                  day={day}
                  page={paging.page}
                  pages={paging.pages}
                  showWeeklyTotal={day === lastWorkedDay(sheet)}
                />
              </FitPreview>
            </div>
          </div>
        </aside>
      </div>

      <div className="print-only">
        {packet.map((item, index) => (
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
              pages={packet.length}
              showWeeklyTotal={item === lastWorkedDay(sheet)}
            />
          </div>
        ))}
      </div>

      <div className="pdf-only" aria-hidden="true">
        <div ref={dayPdfRef} className="print-page">
          <PaySheetDocument
            sheet={sheet}
            day={day}
            page={1}
            pages={1}
            showWeeklyTotal={day === lastWorkedDay(sheet)}
          />
        </div>
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
          <PdfMenu
            busy={busy}
            ready={ready}
            day={day}
            weekPages={packet.length}
            className="h-11 flex-1"
            onPick={handlePdf}
          />
        </div>
      </div>
    </div>
  );
}

function saveStatusLabel(
  ready: boolean,
  savedAt: number | null,
  session: Session | null,
  syncStatus: "idle" | "syncing" | "synced" | "error",
): string {
  const time = savedAt
    ? new Date(savedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  if (!ready) return "Loading…";
  if (syncStatus === "syncing") return "Syncing…";
  if (session && syncStatus === "synced") {
    return time ? `Synced · ${time}` : "Synced to your account";
  }
  if (session && syncStatus === "error") {
    return time
      ? `Saved on this device · ${time}`
      : "Saved on this device — cloud unreachable";
  }
  return time
    ? `Saved on this device · ${time}`
    : "Saves on this device as you type";
}

function PdfMenu({
  busy,
  ready,
  day,
  weekPages,
  className,
  onPick,
}: {
  busy: boolean;
  ready: boolean;
  day: Weekday;
  weekPages: number;
  className?: string;
  onPick: (scope: PacketScope) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy || !ready}
        className={cn(buttonVariants(), className)}
      >
        <Download />
        {busy ? "Building PDF…" : "Download PDF"}
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuItem
          className="max-md:h-11"
          onClick={() => onPick("day")}
        >
          This day ({WEEKDAY_LABELS[day]})
        </DropdownMenuItem>
        <DropdownMenuItem
          className="max-md:h-11"
          onClick={() => onPick("week")}
        >
          All days with work
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {weekPages} page{weekPages === 1 ? "" : "s"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FitPreview({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const width = node.getBoundingClientRect().width;
      if (width < 8) return;
      setScale(Math.min(1, width / 1056));
    };
    update();
    const id = window.requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [active]);

  return (
    <div ref={ref} className="w-full min-w-0 max-w-full overflow-hidden">
      <div style={{ height: 816 * scale, width: "100%" }}>
        <div
          style={{
            width: 1056,
            height: 816,
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
