import assert from "node:assert/strict";
import test from "node:test";
import { createBlankSheet, ensureSheet } from "./pay-sheet";
import {
  deleteWeek,
  listWeeks,
  loadDraft,
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
