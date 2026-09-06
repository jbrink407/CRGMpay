import { STARTER_CODES, type PieceCode } from "./job-codes";
import {
  WEEKDAYS,
  ensureSheet,
  saturdayOfWeek,
  weeklyTotal,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";

const DRAFT_KEY = "crgmpay:draft:v4";
const WEEKS_KEY = "crgmpay:weeks:v5";
const CURRENT_KEY = "crgmpay:current:v5";
const CODES_KEY = "crgmpay:codes:v2";

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
    if (!raw) return migrateLegacyDraft();
    const parsed = JSON.parse(raw) as Record<string, WeekRecord>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function migrateLegacyDraft(): Record<string, WeekRecord> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PaySheet;
    const sheet = ensureSheet(parsed);
    const record = { sheet, updatedAt: Date.now() };
    const map = { [sheet.weekEnding]: record };
    localStorage.setItem(WEEKS_KEY, JSON.stringify(map));
    localStorage.setItem(CURRENT_KEY, sheet.weekEnding);
    return map;
  } catch {
    return {};
  }
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
    weekEnding: saturdayOfWeek(weekEnding) || weekEnding,
  });
}

export function loadCodes(): PieceCode[] {
  if (typeof window === "undefined") return STARTER_CODES;
  try {
    const raw = localStorage.getItem(CODES_KEY);
    if (!raw) return STARTER_CODES;
    const parsed = JSON.parse(raw) as PieceCode[];
    if (!Array.isArray(parsed) || parsed.length === 0) return STARTER_CODES;
    return parsed.map((item) => ({
      code: String(item.code || "").toUpperCase(),
      description: String(item.description || ""),
      unit: String(item.unit || "ea"),
      rate: Number(item.rate) || 0,
    }));
  } catch {
    return STARTER_CODES;
  }
}

export function saveCodes(codes: PieceCode[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CODES_KEY, JSON.stringify(codes));
}

export function ensureWeekday(day: string): Weekday {
  return WEEKDAYS.includes(day as Weekday) ? (day as Weekday) : "monday";
}
