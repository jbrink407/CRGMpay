import {
  STARTER_CODES,
  ensureCodeIds,
  type PieceCode,
} from "./job-codes";
import {
  STARTER_CUSTOMERS,
  ensureCustomerIds,
  isPlaceholderBuilder,
  type Customer,
} from "./customers";
import {
  WEEKDAYS,
  emptyJob,
  ensureSheet,
  jobHasContent,
  newId,
  type JobLine,
  type PaySheet,
  type Weekday,
} from "./pay-sheet";
import {
  emptySnapshot,
  parseSnapshot,
  type PaySnapshot,
  type WeekRecord,
} from "./storage";
import { getSupabase } from "./supabase";

function lineFingerprint(line: JobLine): string {
  return [
    line.date,
    line.customer.trim().toLowerCase(),
    line.address.trim().toLowerCase(),
    line.code.trim().toUpperCase(),
    line.qty,
    line.rate,
    line.comments.trim().toLowerCase(),
  ].join("|");
}

function mergeDayLines(newer: JobLine[], older: JobLine[]): JobLine[] {
  const result: JobLine[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();

  function add(line: JobLine) {
    if (!jobHasContent(line)) return;
    const key = lineFingerprint(line);
    if (seenKeys.has(key)) return;
    if (seenIds.has(line.id)) {
      result.push({ ...line, id: newId() });
    } else {
      result.push(line);
      seenIds.add(line.id);
    }
    seenKeys.add(key);
  }

  for (const line of newer) add(line);
  for (const line of older) add(line);

  const date =
    newer.find((line) => line.date)?.date ||
    older.find((line) => line.date)?.date ||
    "";
  while (result.length < 4) {
    result.push(emptyJob({ date }));
  }
  return result;
}

function pickName(newer: string, older: string): string {
  return newer.trim() ? newer : older;
}

export function mergeWeekRecords(a: WeekRecord, b: WeekRecord): WeekRecord {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const older = a.updatedAt >= b.updatedAt ? b : a;
  const days = {} as PaySheet["days"];
  for (const day of WEEKDAYS) {
    days[day] = mergeDayLines(
      newer.sheet.days?.[day] ?? [],
      older.sheet.days?.[day] ?? [],
    );
  }
  return {
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    sheet: ensureSheet({
      installerName: pickName(
        newer.sheet.installerName,
        older.sheet.installerName,
      ),
      helperName: pickName(newer.sheet.helperName, older.sheet.helperName),
      weekEnding: newer.sheet.weekEnding || older.sheet.weekEnding,
      days,
    }),
  };
}

function mergeByKey<T>(
  newer: T[],
  older: T[],
  id: (item: T) => string,
  alias: (item: T) => string,
): T[] {
  const result: T[] = [];
  const seenId = new Set<string>();
  const seenAlias = new Set<string>();
  for (const item of [...newer, ...older]) {
    const itemId = id(item);
    const itemAlias = alias(item);
    if (itemId && seenId.has(itemId)) continue;
    if (itemAlias && seenAlias.has(itemAlias)) continue;
    result.push(item);
    if (itemId) seenId.add(itemId);
    if (itemAlias) seenAlias.add(itemAlias);
  }
  return result;
}

function mergeCodes(local: PaySnapshot, remote: PaySnapshot): PieceCode[] {
  const localNewer = local.codesUpdatedAt >= remote.codesUpdatedAt;
  const newer = localNewer ? local.codes : remote.codes;
  const older = localNewer ? remote.codes : local.codes;
  const merged = mergeByKey(
    newer,
    older,
    (item) => item.id,
    (item) => item.code.trim().toUpperCase(),
  );
  const list = ensureCodeIds(merged);
  return list.length ? list : STARTER_CODES;
}

function mergeCustomers(local: PaySnapshot, remote: PaySnapshot): Customer[] {
  const localNewer = local.customersUpdatedAt >= remote.customersUpdatedAt;
  const newer = localNewer ? local.customers : remote.customers;
  const older = localNewer ? remote.customers : local.customers;
  const merged = mergeByKey(
    newer.filter((item) => !isPlaceholderBuilder(item.name)),
    older.filter((item) => !isPlaceholderBuilder(item.name)),
    (item) => item.id,
    (item) => item.name.trim().toLowerCase(),
  );
  const list = ensureCustomerIds(merged);
  return list.length ? list : STARTER_CUSTOMERS;
}

export function mergeSnapshots(
  local: PaySnapshot,
  remote: PaySnapshot,
): PaySnapshot {
  const weeks: Record<string, WeekRecord> = {};
  const endings = new Set([
    ...Object.keys(local.weeks || {}),
    ...Object.keys(remote.weeks || {}),
  ]);
  for (const ending of endings) {
    const a = local.weeks[ending];
    const b = remote.weeks[ending];
    if (!a) weeks[ending] = b;
    else if (!b) weeks[ending] = a;
    else weeks[ending] = mergeWeekRecords(a, b);
  }

  const deletedWeeks: Record<string, number> = { ...(local.deletedWeeks || {}) };
  for (const [ending, at] of Object.entries(remote.deletedWeeks || {})) {
    deletedWeeks[ending] = Math.max(deletedWeeks[ending] ?? 0, Number(at) || 0);
  }

  for (const ending of Object.keys(weeks)) {
    const deletedAt = deletedWeeks[ending];
    if (!deletedAt) continue;
    if (deletedAt >= weeks[ending].updatedAt) {
      delete weeks[ending];
    } else {
      delete deletedWeeks[ending];
    }
  }

  const current =
    (local.currentWeekEnding && weeks[local.currentWeekEnding]
      ? local.currentWeekEnding
      : null) ||
    (remote.currentWeekEnding && weeks[remote.currentWeekEnding]
      ? remote.currentWeekEnding
      : null) ||
    Object.values(weeks).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.sheet
      .weekEnding ||
    null;

  return {
    version: 1,
    weeks,
    currentWeekEnding: current,
    codes: mergeCodes(local, remote),
    customers: mergeCustomers(local, remote),
    codesUpdatedAt: Math.max(local.codesUpdatedAt, remote.codesUpdatedAt),
    customersUpdatedAt: Math.max(
      local.customersUpdatedAt,
      remote.customersUpdatedAt,
    ),
    deletedWeeks,
  };
}

export function cloudErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "Could not reach the cloud.";
  if (/could not find the table|relation .* does not exist|schema cache/i.test(message)) {
    return "Cloud table is missing. Run supabase/schema.sql in the Supabase SQL editor.";
  }
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return "Could not reach the cloud. This device still has your week.";
  }
  return message;
}

export async function pullRemoteSnapshot(
  userId: string,
): Promise<PaySnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("pay_state")
    .select("snapshot")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.snapshot) return null;
  return parseSnapshot(data.snapshot) ?? emptySnapshot();
}

export async function pushRemoteSnapshot(
  userId: string,
  snapshot: PaySnapshot,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from("pay_state").upsert(
    {
      user_id: userId,
      snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}
