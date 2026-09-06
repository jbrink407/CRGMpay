import { STARTER_CODES, type PieceCode } from "@/lib/job-codes";
import {
  WEEKDAYS,
  createBlankSheet,
  emptyDay,
  weekdayDate,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";

const DRAFT_KEY = "crgmpay:draft:v3";
const CODES_KEY = "crgmpay:codes";

export function loadDraft(): PaySheet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PaySheet;
    if (!parsed || typeof parsed !== "object") return null;
    const blank = createBlankSheet();
    const days = { ...blank.days };
    for (const day of WEEKDAYS) {
      days[day] = parsed.days?.[day]?.length
        ? parsed.days[day]
        : emptyDay(4, weekdayDate(parsed.weekEnding || blank.weekEnding, day));
    }
    return {
      ...blank,
      ...parsed,
      days,
    };
  } catch {
    return null;
  }
}

export function saveDraft(sheet: PaySheet) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(sheet));
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
