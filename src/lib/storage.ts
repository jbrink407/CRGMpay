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
const CODES_AT_KEY = "crgmpay:codes-at:v1";
const CUSTOMERS_AT_KEY = "crgmpay:customers-at:v1";
const DELETED_KEY = "crgmpay:deleted-weeks:v1";

function hasStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export interface WeekSummary {
  weekEnding: string;
  installerName: string;
  helperName: string;
  total: number;
  updatedAt: number;
}

export interface WeekRecord {
  sheet: PaySheet;
  updatedAt: number;
}

export interface PaySnapshot {
  version: 1;
  weeks: Record<string, WeekRecord>;
  currentWeekEnding: string | null;
  codes: PieceCode[];
  customers: Customer[];
  codesUpdatedAt: number;
  customersUpdatedAt: number;
  deletedWeeks: Record<string, number>;
}

export function emptySnapshot(): PaySnapshot {
  return {
    version: 1,
    weeks: {},
    currentWeekEnding: null,
    codes: STARTER_CODES,
    customers: STARTER_CUSTOMERS,
    codesUpdatedAt: 0,
    customersUpdatedAt: 0,
    deletedWeeks: {},
  };
}

function readTimestamp(key: string): number {
  if (!hasStorage()) return 0;
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function loadDeletedWeeks(): Record<string, number> {
  if (!hasStorage()) return {};
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [ending, at] of Object.entries(parsed)) {
      const value = Number(at);
      if (ending && Number.isFinite(value)) out[ending] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function saveDeletedWeeks(deleted: Record<string, number>) {
  if (!hasStorage()) return;
  if (Object.keys(deleted).length === 0) {
    localStorage.removeItem(DELETED_KEY);
    return;
  }
  localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
}

function clearDeletedWeek(weekEnding: string) {
  const deleted = loadDeletedWeeks();
  if (!(weekEnding in deleted)) return;
  delete deleted[weekEnding];
  saveDeletedWeeks(deleted);
}

function normalizeWeekMap(raw: unknown): Record<string, WeekRecord> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, WeekRecord> = {};
  for (const value of Object.values(raw as Record<string, WeekRecord>)) {
    if (!value?.sheet) continue;
    const sheet = ensureSheet(value.sheet);
    out[sheet.weekEnding] = {
      sheet,
      updatedAt: Number(value.updatedAt) || 0,
    };
  }
  return out;
}

function loadWeekMap(): Record<string, WeekRecord> {
  if (!hasStorage()) return {};
  try {
    const raw = localStorage.getItem(WEEKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, WeekRecord>;
      if (parsed && typeof parsed === "object") return normalizeWeekMap(parsed);
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
  if (!hasStorage()) return null;
  const map = loadWeekMap();
  const current = localStorage.getItem(CURRENT_KEY);
  if (current && map[current]) return ensureSheet(map[current].sheet);
  const latest = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return latest ? ensureSheet(latest.sheet) : null;
}

export function saveDraft(sheet: PaySheet) {
  if (!hasStorage()) return;
  const normalized = ensureSheet(sheet);
  const map = loadWeekMap();
  const previous = map[normalized.weekEnding];
  const unchanged =
    previous && JSON.stringify(previous.sheet) === JSON.stringify(normalized);
  map[normalized.weekEnding] = {
    sheet: normalized,
    updatedAt: unchanged ? previous.updatedAt : Date.now(),
  };
  localStorage.setItem(WEEKS_KEY, JSON.stringify(map));
  localStorage.setItem(CURRENT_KEY, normalized.weekEnding);
  clearDeletedWeek(normalized.weekEnding);
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

export function deleteWeek(weekEnding: string): WeekSummary[] {
  if (!hasStorage()) return [];
  const ending = sundayOfWeek(weekEnding) || weekEnding;
  const map = loadWeekMap();
  delete map[ending];
  localStorage.setItem(WEEKS_KEY, JSON.stringify(map));
  const deleted = loadDeletedWeeks();
  deleted[ending] = Date.now();
  saveDeletedWeeks(deleted);
  const current = localStorage.getItem(CURRENT_KEY);
  if (current === ending) {
    const next = Object.values(map)
      .map((record) => ensureSheet(record.sheet))
      .sort((a, b) => b.weekEnding.localeCompare(a.weekEnding))[0];
    if (next) {
      localStorage.setItem(CURRENT_KEY, next.weekEnding);
    } else {
      localStorage.removeItem(CURRENT_KEY);
    }
  }
  return listWeeks();
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
  if (!hasStorage()) return STARTER_CODES;
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
  if (!hasStorage()) return;
  const next = JSON.stringify(ensureCodeIds(codes));
  const prev = localStorage.getItem(CODES_KEY);
  localStorage.setItem(CODES_KEY, next);
  if (prev !== null && prev !== next) {
    localStorage.setItem(CODES_AT_KEY, String(Date.now()));
  }
}

export function loadCustomers(): Customer[] {
  if (!hasStorage()) return STARTER_CUSTOMERS;
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
  if (!hasStorage()) return;
  const next = JSON.stringify(ensureCustomerIds(customers));
  const prev = localStorage.getItem(CUSTOMERS_KEY);
  localStorage.setItem(CUSTOMERS_KEY, next);
  if (prev !== null && prev !== next) {
    localStorage.setItem(CUSTOMERS_AT_KEY, String(Date.now()));
  }
}

export function loadSnapshot(): PaySnapshot {
  if (!hasStorage()) return emptySnapshot();
  return {
    version: 1,
    weeks: loadWeekMap(),
    currentWeekEnding: localStorage.getItem(CURRENT_KEY),
    codes: loadCodes(),
    customers: loadCustomers(),
    codesUpdatedAt: readTimestamp(CODES_AT_KEY),
    customersUpdatedAt: readTimestamp(CUSTOMERS_AT_KEY),
    deletedWeeks: loadDeletedWeeks(),
  };
}

export function applySnapshot(snapshot: PaySnapshot) {
  if (!hasStorage()) return;
  const weeks = normalizeWeekMap(snapshot.weeks);
  localStorage.setItem(WEEKS_KEY, JSON.stringify(weeks));
  if (snapshot.currentWeekEnding && weeks[snapshot.currentWeekEnding]) {
    localStorage.setItem(CURRENT_KEY, snapshot.currentWeekEnding);
  } else {
    const latest = Object.values(weeks).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )[0];
    if (latest) localStorage.setItem(CURRENT_KEY, latest.sheet.weekEnding);
    else localStorage.removeItem(CURRENT_KEY);
  }
  localStorage.setItem(CODES_KEY, JSON.stringify(ensureCodeIds(snapshot.codes)));
  localStorage.setItem(
    CUSTOMERS_KEY,
    JSON.stringify(ensureCustomerIds(snapshot.customers)),
  );
  localStorage.setItem(CODES_AT_KEY, String(snapshot.codesUpdatedAt || 0));
  localStorage.setItem(
    CUSTOMERS_AT_KEY,
    String(snapshot.customersUpdatedAt || 0),
  );
  saveDeletedWeeks(snapshot.deletedWeeks || {});
}

export function snapshotCurrentSheet(snapshot: PaySnapshot): PaySheet | null {
  const ending = snapshot.currentWeekEnding;
  if (ending && snapshot.weeks[ending]) {
    return ensureSheet(snapshot.weeks[ending].sheet);
  }
  const latest = Object.values(snapshot.weeks).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )[0];
  return latest ? ensureSheet(latest.sheet) : null;
}

export function parseSnapshot(raw: unknown): PaySnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PaySnapshot>;
  const weeks = normalizeWeekMap(value.weeks);
  if (!value.weeks && Object.keys(weeks).length === 0 && !value.codes) {
    return emptySnapshot();
  }
  return {
    version: 1,
    weeks,
    currentWeekEnding: value.currentWeekEnding || null,
    codes: Array.isArray(value.codes)
      ? ensureCodeIds(value.codes)
      : STARTER_CODES,
    customers: Array.isArray(value.customers)
      ? ensureCustomerIds(value.customers)
      : STARTER_CUSTOMERS,
    codesUpdatedAt: Number(value.codesUpdatedAt) || 0,
    customersUpdatedAt: Number(value.customersUpdatedAt) || 0,
    deletedWeeks:
      value.deletedWeeks && typeof value.deletedWeeks === "object"
        ? Object.fromEntries(
            Object.entries(value.deletedWeeks).filter(([, at]) =>
              Number.isFinite(Number(at)),
            ),
          )
        : {},
  };
}

export function ensureWeekday(day: string): Weekday {
  return WEEKDAYS.includes(day as Weekday) ? (day as Weekday) : "monday";
}
