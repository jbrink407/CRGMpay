import assert from "node:assert/strict";
import test from "node:test";
import { ensureSheet, jobHasContent } from "./pay-sheet";
import { emptySnapshot, type PaySnapshot, type WeekRecord } from "./storage";
import { mergeSnapshots } from "./sync";

function week(
  ending: string,
  updatedAt: number,
  lines: Array<{ id: string; customer: string; code?: string }>,
  names?: { installerName?: string; helperName?: string },
): WeekRecord {
  const sheet = ensureSheet({
    installerName: names?.installerName || "Joseph Scott Kemper",
    helperName: names?.helperName || "Joshua Brinker",
    weekEnding: ending,
  });
  sheet.days.monday = [
    ...lines.map((line) => ({
      id: line.id,
      date: "2026-08-31",
      customer: line.customer,
      address: "214 Oak Ridge Dr",
      code: line.code || "BORE",
      qty: 1,
      rate: 10.25,
      comments: "",
    })),
    ...sheet.days.monday.slice(lines.length),
  ];
  return { sheet, updatedAt };
}

function snap(partial: Partial<PaySnapshot>): PaySnapshot {
  return { ...emptySnapshot(), ...partial };
}

test("mergeSnapshots keeps both devices' lines for the same Sunday", () => {
  const ending = "2026-09-06";
  const merged = mergeSnapshots(
    snap({
      currentWeekEnding: ending,
      weeks: {
        [ending]: week(ending, 100, [{ id: "phone-1", customer: "Henderson" }]),
      },
    }),
    snap({
      currentWeekEnding: ending,
      weeks: {
        [ending]: week(ending, 80, [
          { id: "laptop-1", customer: "Westfield Apts", code: "FECLAB" },
        ]),
      },
    }),
  );
  const monday = merged.weeks[ending].sheet.days.monday.filter(jobHasContent);
  assert.equal(monday.length, 2);
  assert.ok(monday.some((line) => line.customer === "Henderson"));
  assert.ok(monday.some((line) => line.customer === "Westfield Apts"));
  assert.equal(merged.weeks[ending].updatedAt, 100);
});

test("mergeSnapshots does not duplicate the same piece-work line", () => {
  const ending = "2026-09-06";
  const line = { id: "monday-0", customer: "Henderson" };
  const merged = mergeSnapshots(
    snap({ weeks: { [ending]: week(ending, 50, [line]) } }),
    snap({ weeks: { [ending]: week(ending, 40, [line]) } }),
  );
  assert.equal(
    merged.weeks[ending].sheet.days.monday.filter(jobHasContent).length,
    1,
  );
});

test("mergeSnapshots drops a week deleted more recently than it was saved", () => {
  const ending = "2026-08-30";
  const merged = mergeSnapshots(
    snap({
      deletedWeeks: { [ending]: 200 },
    }),
    snap({
      weeks: { [ending]: week(ending, 100, [{ id: "a", customer: "Henderson" }]) },
    }),
  );
  assert.equal(merged.weeks[ending], undefined);
});

test("mergeSnapshots keeps a week that was edited after it was deleted", () => {
  const ending = "2026-08-30";
  const merged = mergeSnapshots(
    snap({
      deletedWeeks: { [ending]: 100 },
    }),
    snap({
      weeks: { [ending]: week(ending, 200, [{ id: "a", customer: "Henderson" }]) },
    }),
  );
  assert.ok(merged.weeks[ending]);
  assert.equal(merged.deletedWeeks[ending], undefined);
});

test("mergeSnapshots unions job codes and prefers the newer rate", () => {
  const merged = mergeSnapshots(
    snap({
      codesUpdatedAt: 200,
      codes: [
        {
          id: "job-BHL",
          code: "BHL",
          description: "",
          unit: "ea",
          rate: 2,
        },
      ],
    }),
    snap({
      codesUpdatedAt: 50,
      codes: [
        {
          id: "job-BHL",
          code: "BHL",
          description: "",
          unit: "ea",
          rate: 1.64,
        },
        {
          id: "job-CUSTOM",
          code: "CUSTOM",
          description: "Shop rate",
          unit: "ea",
          rate: 9,
        },
      ],
    }),
  );
  const bhl = merged.codes.find((item) => item.code === "BHL");
  const custom = merged.codes.find((item) => item.code === "CUSTOM");
  assert.equal(bhl?.rate, 2);
  assert.equal(custom?.rate, 9);
  assert.equal(merged.codesUpdatedAt, 200);
});

test("mergeSnapshots prefers the open week on this device", () => {
  const merged = mergeSnapshots(
    snap({
      currentWeekEnding: "2026-09-06",
      weeks: {
        "2026-09-06": week("2026-09-06", 10, []),
        "2026-08-30": week("2026-08-30", 90, []),
      },
    }),
    snap({
      currentWeekEnding: "2026-08-30",
      weeks: {
        "2026-09-06": week("2026-09-06", 10, []),
        "2026-08-30": week("2026-08-30", 90, []),
      },
    }),
  );
  assert.equal(merged.currentWeekEnding, "2026-09-06");
});
