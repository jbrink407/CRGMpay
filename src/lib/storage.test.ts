import assert from "node:assert/strict";
import test from "node:test";
import { createBlankSheet, ensureSheet } from "./pay-sheet";
import {
  applySnapshot,
  deleteWeek,
  listWeeks,
  loadDraft,
  loadSnapshot,
  saveCodes,
  saveDraft,
} from "./storage";

function installMemoryStorage() {
  const store = new Map<string, string>();
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
  });
}

test("deleteWeek removes a previous week without changing the current draft", () => {
  installMemoryStorage();
  const current = ensureSheet({
    installerName: "Joseph Scott Kemper",
    helperName: "Joshua Brinker",
    weekEnding: "2026-09-06",
  });
  const previous = ensureSheet({
    installerName: "Joseph Scott Kemper",
    helperName: "Joshua Brinker",
    weekEnding: "2026-08-30",
  });
  saveDraft(previous);
  saveDraft(current);

  const remaining = deleteWeek("2026-08-30");
  assert.deepEqual(
    remaining.map((week) => week.weekEnding),
    ["2026-09-06"],
  );
  assert.equal(loadDraft()?.weekEnding, "2026-09-06");
  assert.equal(listWeeks().length, 1);
});

test("deleteWeek of the open week points current at the next remaining week", () => {
  installMemoryStorage();
  saveDraft(ensureSheet({ weekEnding: "2026-08-23" }));
  saveDraft(ensureSheet({ weekEnding: "2026-08-30" }));
  saveDraft(ensureSheet({ weekEnding: "2026-09-06" }));

  const remaining = deleteWeek("2026-09-06");
  assert.deepEqual(
    remaining.map((week) => week.weekEnding),
    ["2026-08-30", "2026-08-23"],
  );
  assert.equal(loadDraft()?.weekEnding, "2026-08-30");
});

test("deleteWeek of the last week clears current so a blank sheet can start", () => {
  installMemoryStorage();
  saveDraft(createBlankSheet());
  const ending = loadDraft()?.weekEnding;
  assert.ok(ending);

  const remaining = deleteWeek(ending);
  assert.equal(remaining.length, 0);
  assert.equal(loadDraft(), null);
});

test("saveDraft does not bump updatedAt when the sheet is unchanged", () => {
  installMemoryStorage();
  saveDraft(ensureSheet({ weekEnding: "2026-09-06", installerName: "Joseph" }));
  const first = loadSnapshot().weeks["2026-09-06"].updatedAt;
  saveDraft(ensureSheet({ weekEnding: "2026-09-06", installerName: "Joseph" }));
  assert.equal(loadSnapshot().weeks["2026-09-06"].updatedAt, first);
});

test("deleteWeek records a tombstone in the snapshot", () => {
  installMemoryStorage();
  saveDraft(ensureSheet({ weekEnding: "2026-09-06" }));
  saveDraft(ensureSheet({ weekEnding: "2026-08-30" }));
  deleteWeek("2026-08-30");
  const snapshot = loadSnapshot();
  assert.equal(snapshot.weeks["2026-08-30"], undefined);
  assert.ok(snapshot.deletedWeeks["2026-08-30"]);
});

test("applySnapshot restores weeks, codes, and the open week", () => {
  installMemoryStorage();
  saveDraft(ensureSheet({ weekEnding: "2026-08-23", installerName: "Old" }));
  applySnapshot({
    version: 1,
    weeks: {
      "2026-09-06": {
        sheet: ensureSheet({
          weekEnding: "2026-09-06",
          installerName: "Joseph Scott Kemper",
        }),
        updatedAt: 50,
      },
    },
    currentWeekEnding: "2026-09-06",
    codes: [
      { id: "job-BHL", code: "BHL", description: "", unit: "ea", rate: 2 },
    ],
    customers: [{ id: "cust-Henderson", name: "Henderson" }],
    codesUpdatedAt: 9,
    customersUpdatedAt: 8,
    deletedWeeks: { "2026-08-23": 12 },
  });
  assert.equal(loadDraft()?.installerName, "Joseph Scott Kemper");
  assert.equal(loadSnapshot().codes[0].rate, 2);
  assert.equal(loadSnapshot().deletedWeeks["2026-08-23"], 12);
  assert.equal(listWeeks().map((week) => week.weekEnding).join(","), "2026-09-06");
});

test("saveCodes only stamps a new time when the list actually changes", () => {
  installMemoryStorage();
  saveCodes([
    { id: "job-BHL", code: "BHL", description: "", unit: "ea", rate: 1.64 },
  ]);
  assert.equal(loadSnapshot().codesUpdatedAt, 0);
  saveCodes([
    { id: "job-BHL", code: "BHL", description: "", unit: "ea", rate: 2 },
  ]);
  const first = loadSnapshot().codesUpdatedAt;
  assert.ok(first > 0);
  saveCodes([
    { id: "job-BHL", code: "BHL", description: "", unit: "ea", rate: 2 },
  ]);
  assert.equal(loadSnapshot().codesUpdatedAt, first);
});
