export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: "SUN",
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
};

export const CLASSIFICATIONS = [
  "INSTALLER",
  "HELPER",
  "FOREMAN",
  "LABORER",
  "APPRENTICE",
  "LEAD",
] as const;

export interface JobLine {
  id: string;
  date: string;
  jobNumber: string;
  customer: string;
  location: string;
  regular: number;
  overtime: number;
  doubletime: number;
  units: number;
  miles: number;
  notes: string;
}

export interface PaySheet {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  formTitle: string;
  classification: string;
  employeeName: string;
  employeeNumber: string;
  employeePhone: string;
  truckOrCrew: string;
  weekEnding: string;
  regularRate: number;
  overtimeMultiplier: number;
  overtimeRateOverride: number | null;
  doubletimeMultiplier: number;
  doubletimeRateOverride: number | null;
  mileageRate: number;
  unitRate: number;
  perDiem: number;
  otherEarnings: number;
  otherEarningsLabel: string;
  draw: number;
  chargebacks: number;
  otherDeductions: number;
  otherDeductionsLabel: string;
  remarks: string;
  jobs: JobLine[];
}

export interface DailyTotals {
  date: string;
  regular: number;
  overtime: number;
  doubletime: number;
  units: number;
  miles: number;
  hours: number;
}

export interface PayTotals {
  regularHours: number;
  overtimeHours: number;
  doubletimeHours: number;
  totalHours: number;
  units: number;
  miles: number;
  regularPay: number;
  overtimePay: number;
  doubletimePay: number;
  mileagePay: number;
  unitPay: number;
  perDiem: number;
  otherEarnings: number;
  gross: number;
  draw: number;
  chargebacks: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  overtimeRate: number;
  doubletimeRate: number;
  byDay: Record<DayKey, DailyTotals>;
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
    jobNumber: "",
    customer: "",
    location: "",
    regular: 0,
    overtime: 0,
    doubletime: 0,
    units: 0,
    miles: 0,
    notes: "",
    ...partial,
  };
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

export function lastSaturday(from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - delta);
  return toISODate(date);
}

export function weekDates(weekEnding: string): Record<DayKey, string> {
  const end = parseISODate(weekEnding) ?? parseISODate(lastSaturday())!;
  const dates = {} as Record<DayKey, string>;
  DAYS.forEach((day, index) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (6 - index));
    dates[day] = toISODate(d);
  });
  return dates;
}

export function formatUSDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return "";
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function formatWeekdayDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

export function formatHours(value: number): string {
  if (!value) return "";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function formatHoursTotal(value: number): string {
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

export function overtimeRate(sheet: PaySheet): number {
  if (sheet.overtimeRateOverride != null && sheet.overtimeRateOverride > 0) {
    return sheet.overtimeRateOverride;
  }
  return roundMoney(sheet.regularRate * sheet.overtimeMultiplier);
}

export function doubletimeRate(sheet: PaySheet): number {
  if (sheet.doubletimeRateOverride != null && sheet.doubletimeRateOverride > 0) {
    return sheet.doubletimeRateOverride;
  }
  return roundMoney(sheet.regularRate * sheet.doubletimeMultiplier);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyDaily(date: string): DailyTotals {
  return {
    date,
    regular: 0,
    overtime: 0,
    doubletime: 0,
    units: 0,
    miles: 0,
    hours: 0,
  };
}

export function calculate(sheet: PaySheet): PayTotals {
  const dates = weekDates(sheet.weekEnding);
  const byDay = {} as Record<DayKey, DailyTotals>;
  for (const day of DAYS) {
    byDay[day] = emptyDaily(dates[day]);
  }

  for (const job of sheet.jobs) {
    if (!job.date) continue;
    const day = DAYS.find((key) => dates[key] === job.date);
    if (!day) continue;
    byDay[day].regular += job.regular;
    byDay[day].overtime += job.overtime;
    byDay[day].doubletime += job.doubletime;
    byDay[day].units += job.units;
    byDay[day].miles += job.miles;
    byDay[day].hours += job.regular + job.overtime + job.doubletime;
  }

  const regularHours = sheet.jobs.reduce((sum, job) => sum + job.regular, 0);
  const overtimeHours = sheet.jobs.reduce((sum, job) => sum + job.overtime, 0);
  const doubletimeHours = sheet.jobs.reduce(
    (sum, job) => sum + job.doubletime,
    0,
  );
  const units = sheet.jobs.reduce((sum, job) => sum + job.units, 0);
  const miles = sheet.jobs.reduce((sum, job) => sum + job.miles, 0);

  const ot = overtimeRate(sheet);
  const dt = doubletimeRate(sheet);

  const regularPay = roundMoney(regularHours * sheet.regularRate);
  const overtimePay = roundMoney(overtimeHours * ot);
  const doubletimePay = roundMoney(doubletimeHours * dt);
  const mileagePay = roundMoney(miles * sheet.mileageRate);
  const unitPay = roundMoney(units * sheet.unitRate);
  const perDiem = roundMoney(sheet.perDiem);
  const otherEarnings = roundMoney(sheet.otherEarnings);

  const gross = roundMoney(
    regularPay +
      overtimePay +
      doubletimePay +
      mileagePay +
      unitPay +
      perDiem +
      otherEarnings,
  );

  const draw = roundMoney(sheet.draw);
  const chargebacks = roundMoney(sheet.chargebacks);
  const otherDeductions = roundMoney(sheet.otherDeductions);
  const totalDeductions = roundMoney(draw + chargebacks + otherDeductions);
  const net = roundMoney(gross - totalDeductions);

  return {
    regularHours,
    overtimeHours,
    doubletimeHours,
    totalHours: regularHours + overtimeHours + doubletimeHours,
    units,
    miles,
    regularPay,
    overtimePay,
    doubletimePay,
    mileagePay,
    unitPay,
    perDiem,
    otherEarnings,
    gross,
    draw,
    chargebacks,
    otherDeductions,
    totalDeductions,
    net,
    overtimeRate: ot,
    doubletimeRate: dt,
    byDay,
  };
}

export function printedJobs(sheet: PaySheet, minRows = 10): JobLine[] {
  const rows = sheet.jobs.filter((job) => jobHasContent(job));
  const padded = [...rows];
  while (padded.length < minRows) {
    padded.push(emptyJob({ id: `blank-${padded.length}` }));
  }
  return padded;
}

export function jobHasContent(job: JobLine): boolean {
  return Boolean(
    job.date ||
      job.jobNumber ||
      job.customer ||
      job.location ||
      job.notes ||
      job.regular ||
      job.overtime ||
      job.doubletime ||
      job.units ||
      job.miles,
  );
}

export function pdfFilename(sheet: PaySheet): string {
  const classification = (sheet.classification || "PAY").trim().toUpperCase();
  const name = (sheet.employeeName || "SHEET").trim();
  return `${classification} ${name}.pdf`;
}

export function createBlankSheet(
  company?: Partial<
    Pick<PaySheet, "companyName" | "companyAddress" | "companyPhone">
  >,
): PaySheet {
  return {
    companyName: company?.companyName || "CRGM",
    companyAddress: company?.companyAddress || "",
    companyPhone: company?.companyPhone || "",
    formTitle: "WEEKLY PAY SHEET",
    classification: "INSTALLER",
    employeeName: "",
    employeeNumber: "",
    employeePhone: "",
    truckOrCrew: "",
    weekEnding: lastSaturday(),
    regularRate: 0,
    overtimeMultiplier: 1.5,
    overtimeRateOverride: null,
    doubletimeMultiplier: 2,
    doubletimeRateOverride: null,
    mileageRate: 0,
    unitRate: 0,
    perDiem: 0,
    otherEarnings: 0,
    otherEarningsLabel: "Other",
    draw: 0,
    chargebacks: 0,
    otherDeductions: 0,
    otherDeductionsLabel: "Other deductions",
    remarks: "",
    jobs: [emptyJob(), emptyJob(), emptyJob(), emptyJob()],
  };
}

export function createSampleSheet(): PaySheet {
  const weekEnding = lastSaturday();
  const dates = weekDates(weekEnding);
  return {
    ...createBlankSheet(),
    companyName: "CRGM",
    companyAddress: "",
    classification: "INSTALLER",
    employeeName: "Joseph Scott Kemper",
    employeeNumber: "1042",
    employeePhone: "",
    truckOrCrew: "3",
    weekEnding,
    regularRate: 28,
    overtimeMultiplier: 1.5,
    overtimeRateOverride: null,
    doubletimeMultiplier: 2,
    doubletimeRateOverride: null,
    mileageRate: 0.67,
    unitRate: 0,
    perDiem: 0,
    jobs: [
      emptyJob({
        date: dates.mon,
        jobNumber: "4418",
        customer: "Henderson residence",
        location: "214 Oak Ridge Dr",
        regular: 8,
        miles: 22,
      }),
      emptyJob({
        date: dates.tue,
        jobNumber: "4421",
        customer: "Westfield Apts — Bldg C",
        location: "88 Commerce Blvd",
        regular: 8,
        miles: 18,
      }),
      emptyJob({
        date: dates.wed,
        jobNumber: "4421",
        customer: "Westfield Apts — Bldg C",
        location: "88 Commerce Blvd",
        regular: 8,
        miles: 18,
      }),
      emptyJob({
        date: dates.thu,
        jobNumber: "4430",
        customer: "St. Marks remodel",
        location: "15 Pine St",
        regular: 8,
        overtime: 1.5,
        miles: 31,
        notes: "After-hours set",
      }),
      emptyJob({
        date: dates.fri,
        jobNumber: "4433",
        customer: "Callback — Henderson",
        location: "214 Oak Ridge Dr",
        regular: 4,
        miles: 22,
        notes: "Warranty punch",
      }),
      emptyJob({
        date: dates.fri,
        jobNumber: "4436",
        customer: "Miller kitchen",
        location: "902 Maple Ave",
        regular: 4,
        miles: 9,
      }),
    ],
  };
}

export function parseNumber(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
