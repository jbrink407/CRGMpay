import { STARTER_CODES, ensureCodeIds, type PieceCode } from "./job-codes";
import {
  STARTER_CUSTOMERS,
  ensureCustomerIds,
  type Customer,
} from "./customers";
import {
  WEEKDAYS,
  ensureSheet,
  sundayOfWeek,
  weeklyTotal,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";

const DRAFT_KEY = "crgmpay:draft:v4";
const WEEKS_KEY = "crgmpay:weeks:v6";
const CURRENT_KEY = "crgmpay:current:v6";
const CODES_KEY = "crgmpay:codes:v2";
const CUSTOMERS_KEY = "crgmpay:customers:v1";

export interface WeekSummary {
  weekEnding: string;
  installerName: string;
  helperName: string;
  total: number;
  updatedAt: number;
}

interface WeekRecord {
  sheet: PaySheet;
  updatedAt: number;
}

function loadWeekMap(): Record<string, WeekRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WEEKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, WeekRecord>;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // fall through to migrate
  }
  return migrateLegacyWeeks();
}

function migrateLegacyWeeks(): Record<string, WeekRecord> {
  const map: Record<string, WeekRecord> = {};
  try {
    const legacyWeeks = localStorage.getItem("crgmpay:weeks:v5");
    if (legacyWeeks) {
      const parsed = JSON.parse(legacyWeeks) as Record<string, WeekRecord>;
      for (const record of Object.values(parsed || {})) {
        const sheet = ensureSheet(record.sheet);
        map[sheet.weekEnding] = {
          sheet,
          updatedAt: record.updatedAt || Date.now(),
        };
      }
    }
  } catch {
    // ignore
  }
  if (Object.keys(map).length === 0) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const sheet = ensureSheet(JSON.parse(raw) as PaySheet);
        map[sheet.weekEnding] = { sheet, updatedAt: Date.now() };
      }
    } catch {
      return {};
    }
  }
  if (Object.keys(map).length) {
    localStorage.setItem(WEEKS_KEY, JSON.stringify(map));
    const current =
      localStorage.getItem("crgmpay:current:v5") ||
      Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.sheet
        .weekEnding;
    if (current) {
      localStorage.setItem(CURRENT_KEY, sundayOfWeek(current));
    }
  }
  return map;
}

export function loadDraft(): PaySheet | null {
  if (typeof window === "undefined") return null;
  const map = loadWeekMap();
  const current = localStorage.getItem(CURRENT_KEY);
  if (current && map[current]) return ensureSheet(map[current].sheet);
  const latest = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return latest ? ensureSheet(latest.sheet) : null;
}

export function saveDraft(sheet: PaySheet) {
  if (typeof window === "undefined") return;
  const normalized = ensureSheet(sheet);
  const map = loadWeekMap();
  map[normalized.weekEnding] = {
    sheet: normalized,
    updatedAt: Date.now(),
  };
  localStorage.setItem(WEEKS_KEY, JSON.stringify(map));
  localStorage.setItem(CURRENT_KEY, normalized.weekEnding);
}

export function loadWeek(weekEnding: string): PaySheet | null {
  const map = loadWeekMap();
  const record = map[weekEnding];
  return record ? ensureSheet(record.sheet) : null;
}

export function listWeeks(): WeekSummary[] {
  return Object.values(loadWeekMap())
    .map((record) => {
      const sheet = ensureSheet(record.sheet);
      return {
        weekEnding: sheet.weekEnding,
        installerName: sheet.installerName,
        helperName: sheet.helperName,
        total: weeklyTotal(sheet),
        updatedAt: record.updatedAt,
      };
    })
    .sort((a, b) => b.weekEnding.localeCompare(a.weekEnding));
}

export function openOrCreateWeek(
  weekEnding: string,
  names: { installerName: string; helperName: string },
): PaySheet {
  const existing = loadWeek(weekEnding);
  if (existing) return existing;
  return ensureSheet({
    installerName: names.installerName,
    helperName: names.helperName,
    weekEnding: sundayOfWeek(weekEnding) || weekEnding,
  });
}

export function loadCodes(): PieceCode[] {
  if (typeof window === "undefined") return STARTER_CODES;
  try {
    const raw = localStorage.getItem(CODES_KEY);
    if (!raw) return STARTER_CODES;
    const parsed = JSON.parse(raw) as PieceCode[];
    if (!Array.isArray(parsed) || parsed.length === 0) return STARTER_CODES;
    return ensureCodeIds(parsed);
  } catch {
    return STARTER_CODES;
  }
}

export function saveCodes(codes: PieceCode[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

export function loadCustomers(): Customer[] {
  if (typeof window === "undefined") return STARTER_CUSTOMERS;
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) return STARTER_CUSTOMERS;
    const parsed = JSON.parse(raw) as Customer[];
    if (!Array.isArray(parsed) || parsed.length === 0) return STARTER_CUSTOMERS;
    return ensureCustomerIds(parsed);
  } catch {
    return STARTER_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

export function ensureWeekday(day: string): Weekday {
  return WEEKDAYS.includes(day as Weekday) ? (day as Weekday) : "monday";
}
