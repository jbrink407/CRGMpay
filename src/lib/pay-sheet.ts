import {
  findCode,
  STARTER_CODES,
  type PieceCode,
} from "./job-codes";

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

/** Mon–Sun payroll week; Sunday is week ending. */
const WEEKDAY_OFFSET: Record<Weekday, number> = {
  monday: 6,
  tuesday: 5,
  wednesday: 4,
  thursday: 3,
  friday: 2,
  saturday: 1,
  sunday: 0,
};

export const WEEKEND_DAYS: Weekday[] = ["sunday", "saturday"];

export function isWeekend(day: Weekday): boolean {
  return WEEKEND_DAYS.includes(day);
}

export const POLICY_LINES = [
  "LEAD NAME and HELPER NAME and DATE work performed are required on every work sheet",
  "GPS is required to be turned on at all times during work hours on device utilizing DispatchTrack",
  "Punch Correction forms must be turned in for any missed punches by end of same business day",
  "Paid and unpaid PTO must be requested onlinme through AllPay by end of same business day",
  "Each day's work should be totalled on Page Total line, last workday total on Weekly Total line",
  "Hourly and Piece Pay installers are required to punch in and out DAILY",
  "Pay sheets may be adjusted for price reconciliation or cost reallocation by the review team and/or leadership",
  "Any missing pay sheets may delay pay until the following week",
  "Any overtime and/or weekend work must be pre-approved by Charles Wiggins prior to workday and all weekend pay sheets and",
  "     punch corrections must be texted to Chuck (404-449-2378) and Stacy (404-379 7870) by end of same business day",
];

export const POLICY_FOOTER =
  "EMPLOYEES ARE RESPONSIBLE FOR FOLLOWING TIME KEEPING PROCEDURES PER COMPANY POLICY";

export interface JobLine {
  id: string;
  date: string;
  customer: string;
  address: string;
  code: string;
  qty: number;
  rate: number;
  comments: string;
}

export interface PaySheet {
  installerName: string;
  helperName: string;
  weekEnding: string;
  days: Record<Weekday, JobLine[]>;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyJob(partial: Partial<JobLine> = {}): JobLine {
  return {
    id: newId(),
    date: "",
    customer: "",
    address: "",
    code: "",
    qty: 0,
    rate: 0,
    comments: "",
    ...partial,
  };
}

export function emptyDay(count = 4, date = "", key = ""): JobLine[] {
  const prefix = key || date || "row";
  return Array.from({ length: count }, (_, index) =>
    emptyJob({ id: `${prefix}-${index}`, date }),
  );
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function lastSunday(from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() - date.getDay());
  return toISODate(date);
}

export function nextSunday(weekEnding: string): string {
  const date = parseISODate(sundayOfWeek(weekEnding));
  if (!date) return lastSunday();
  date.setDate(date.getDate() + 7);
  return toISODate(date);
}

/** Sunday on or after this date in the Mon–Sun payroll week. */
export function sundayOfWeek(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return lastSunday();
  date.setDate(date.getDate() + ((7 - date.getDay()) % 7));
  return toISODate(date);
}

/** Week ending is Sunday; Monday–Saturday are the six days before it. */
export function weekdayDate(weekEnding: string, day: Weekday): string {
  const end = parseISODate(weekEnding) ?? parseISODate(lastSunday())!;
  const date = new Date(end);
  date.setDate(end.getDate() - WEEKDAY_OFFSET[day]);
  return toISODate(date);
}

export function weekdayFromIso(
  iso: string,
  weekEnding: string,
): Weekday | null {
  for (const day of WEEKDAYS) {
    if (weekdayDate(weekEnding, day) === iso) return day;
  }
  return null;
}

export function formatUSDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return "";
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function formatQty(value: number): string {
  if (!value) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function formatMoney(value: number, emptyZero = false): string {
  if (emptyZero && !value) return "";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatRate(value: number): string {
  if (!value) return "";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function lineAmount(line: JobLine): number {
  return roundMoney(line.qty * line.rate);
}

export function applyCodeToLine(
  line: JobLine,
  code: string,
  codes: PieceCode[],
): JobLine {
  const match = findCode(codes, code);
  return {
    ...line,
    code: match?.code || code.toUpperCase(),
    rate: match?.rate ?? 0,
  };
}

export function jobHasContent(job: JobLine): boolean {
  return Boolean(
    job.customer ||
      job.address ||
      job.comments ||
      job.code ||
      job.qty ||
      job.rate,
  );
}

export function pageTotal(lines: JobLine[]): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + lineAmount(line), 0),
  );
}

export function weeklyTotal(sheet: PaySheet): number {
  return roundMoney(
    WEEKDAYS.reduce((sum, day) => sum + pageTotal(sheet.days[day] ?? []), 0),
  );
}

export function sheetHasWork(sheet: PaySheet): boolean {
  return WEEKDAYS.some((day) =>
    (sheet.days[day] ?? []).some((line) => jobHasContent(line)),
  );
}

export function ensureSheet(partial: Partial<PaySheet> | null | undefined): PaySheet {
  const blank = createBlankSheet();
  const weekEnding = sundayOfWeek(
    partial?.weekEnding || blank.weekEnding,
  );
  const days = { ...blank.days };
  for (const day of WEEKDAYS) {
    const rows = partial?.days?.[day];
    days[day] = rows?.length
      ? rows
      : emptyDay(4, weekdayDate(weekEnding, day), day);
  }
  return {
    installerName: partial?.installerName ?? "",
    helperName: partial?.helperName ?? "",
    weekEnding,
    days,
  };
}

export function printedJobs(lines: JobLine[], minRows = 20): JobLine[] {
  const rows = lines.filter((job) => jobHasContent(job) || job.date);
  const padded = [...rows];
  while (padded.length < minRows) {
    padded.push(emptyJob({ id: `blank-${padded.length}` }));
  }
  return padded.slice(0, minRows);
}

export function pdfFilename(sheet: PaySheet): string {
  const name = (sheet.installerName || "SHEET").trim();
  return `INSTALLER ${name}.pdf`;
}

export function createBlankSheet(): PaySheet {
  const weekEnding = lastSunday();
  const days = {} as Record<Weekday, JobLine[]>;
  for (const day of WEEKDAYS) {
    days[day] = emptyDay(4, weekdayDate(weekEnding, day), day);
  }
  return {
    installerName: "",
    helperName: "",
    weekEnding,
    days,
  };
}

export function applyWeekEnding(sheet: PaySheet, weekEnding: string): PaySheet {
  const ending = sundayOfWeek(weekEnding);
  const days = { ...sheet.days };
  for (const day of WEEKDAYS) {
    const previous = weekdayDate(sheet.weekEnding, day);
    const next = weekdayDate(ending, day);
    days[day] = (days[day] ?? []).map((line) =>
      !line.date || line.date === previous ? { ...line, date: next } : line,
    );
  }
  return { ...sheet, weekEnding: ending, days };
}

export function createSampleSheet(codes: PieceCode[] = STARTER_CODES): PaySheet {
  const sheet = createBlankSheet();
  sheet.installerName = "Joseph Scott Kemper";
  sheet.helperName = "Joshua Brinker";
  const mon = weekdayDate(sheet.weekEnding, "monday");
  const tue = weekdayDate(sheet.weekEnding, "tuesday");
  const wed = weekdayDate(sheet.weekEnding, "wednesday");
  const sat = weekdayDate(sheet.weekEnding, "saturday");

  function line(
    date: string,
    customer: string,
    address: string,
    code: string,
    qty: number,
    comments = "",
  ): JobLine {
    const match = findCode(codes, code);
    return emptyJob({
      date,
      customer,
      address,
      code: match?.code || code,
      qty,
      rate: match?.rate ?? 0,
      comments,
    });
  }

  sheet.days.monday = [
    line(mon, "Henderson", "214 Oak Ridge Dr", "BORE", 2),
    line(mon, "Henderson", "214 Oak Ridge Dr", "HSLAB", 3),
    line(mon, "Henderson", "214 Oak Ridge Dr", "LOCLAB", 3),
    line(mon, "Henderson", "214 Oak Ridge Dr", "REKEY", 1),
    ...emptyDay(2, mon),
  ];
  sheet.days.tuesday = [
    line(tue, "Westfield Apts", "Bldg C / 88 Commerce Blvd", "FD791LAB", 1),
    line(tue, "Westfield Apts", "Bldg C / 88 Commerce Blvd", "FECLAB", 2),
    line(tue, "Westfield Apts", "Bldg C / 88 Commerce Blvd", "KICKLAB", 4),
    ...emptyDay(2, tue),
  ];
  sheet.days.wednesday = [
    line(wed, "St. Marks", "15 Pine St", "STEAMLAB", 1),
    line(wed, "St. Marks", "15 Pine St", "XPANEL", 2),
    line(wed, "Henderson", "214 Oak Ridge Dr", "GBL", 1, "Warranty punch"),
    ...emptyDay(2, wed),
  ];
  sheet.days.saturday = [
    line(
      sat,
      "Henderson",
      "214 Oak Ridge Dr",
      "REKEY",
      1,
      "Weekend — Chuck approved",
    ),
    ...emptyDay(2, sat),
  ];
  return sheet;
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
