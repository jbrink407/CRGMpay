import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_CODES, emptyCode, ensureCodeIds, findCode } from "./job-codes";
import {
  applyWeekEnding,
  createBlankSheet,
  createSampleSheet,
  daysWorked,
  ensureSheet,
  formatUSDate,
  lastWorkedDay,
  lineAmount,
  nextSunday,
  pageTotal,
  pdfFilename,
  printDays,
  packetDays,
  sheetPage,
  sundayOfWeek,
  weeklyTotal,
  weekdayDate,
} from "./pay-sheet";

test("new job codes keep a stable id while the code text changes", () => {
  const created = emptyCode();
  const typed = { ...created, code: "B" };
  const again = { ...typed, code: "BH" };
  assert.equal(created.id, typed.id);
  assert.equal(typed.id, again.id);
  assert.notEqual(emptyCode().id, created.id);
});

test("saved codes without ids get stable ids that survive code edits", () => {
  const loaded = ensureCodeIds([{ code: "BHL", rate: 1.64 }]);
  assert.equal(loaded[0].id, "job-BHL");
  const edited = ensureCodeIds([{ ...loaded[0], code: "BHLX" }]);
  assert.equal(edited[0].id, "job-BHL");
});

test("company codes match the Job Codes tab", () => {
  assert.equal(STARTER_CODES.length, 43);
  assert.equal(findCode(STARTER_CODES, "bore")?.rate, 10.25);
  assert.equal(findCode(STARTER_CODES, "FD791LAB")?.rate, 39.36);
  assert.equal(findCode(STARTER_CODES, "FDCSDLAB")?.rate, 82);
});

test("sample week uses installer names from the workbook", () => {
  const sheet = createSampleSheet();
  assert.equal(sheet.installerName, "Joseph Scott Kemper");
  assert.equal(sheet.helperName, "Joshua Brinker");
  assert.equal(pdfFilename(sheet), "INSTALLER Joseph Scott Kemper.pdf");
  assert.equal(
    pdfFilename(sheet, "tuesday"),
    "INSTALLER Joseph Scott Kemper Tuesday.pdf",
  );
  assert.equal(pageTotal(sheet.days.monday), 58.85);
  assert.equal(pageTotal(sheet.days.thursday), 0);
  assert.equal(pageTotal(sheet.days.saturday), 20.5);
  assert.equal(weeklyTotal(sheet), 204.83);
});

test("piece line is qty times rate", () => {
  assert.equal(
    lineAmount({
      id: "1",
      date: "",
      customer: "",
      address: "",
      code: "BORE",
      qty: 2,
      rate: 10.25,
      comments: "",
    }),
    20.5,
  );
});

test("week ending Sunday maps Monday–Sunday", () => {
  assert.equal(weekdayDate("2026-09-06", "monday"), "2026-08-31");
  assert.equal(weekdayDate("2026-09-06", "friday"), "2026-09-04");
  assert.equal(weekdayDate("2026-09-06", "saturday"), "2026-09-05");
  assert.equal(weekdayDate("2026-09-06", "sunday"), "2026-09-06");
  assert.equal(formatUSDate("2026-09-06"), "9/6/2026");
});

test("changing week ending updates auto dates", () => {
  const sheet = createSampleSheet();
  const next = applyWeekEnding(sheet, "2026-09-06");
  assert.equal(next.days.monday[0].date, "2026-08-31");
  assert.equal(next.days.monday[0].customer, "Henderson");
});

test("blank weekday rows use stable ids", () => {
  const first = createBlankSheet();
  const second = createBlankSheet();
  assert.equal(first.days.monday[0].id, second.days.monday[0].id);
  assert.equal(first.days.monday[0].id, "monday-0");
  assert.ok(first.days.sunday);
  assert.ok(first.days.saturday);
});

test("older drafts without weekend days still load", () => {
  const sheet = ensureSheet({
    installerName: "Test",
    helperName: "",
    weekEnding: "2026-09-05",
    days: {
      monday: [],
    } as never,
  });
  assert.equal(sheet.days.monday[0].date, "2026-08-31");
  assert.equal(sheet.days.saturday[0].date, "2026-09-05");
  assert.equal(sheet.days.sunday[0].date, "2026-09-06");
  assert.equal(sheet.weekEnding, "2026-09-06");
});

test("sunday of week and next sunday", () => {
  assert.equal(sundayOfWeek("2026-09-02"), "2026-09-06");
  assert.equal(nextSunday("2026-09-06"), "2026-09-13");
});

test("weekly total prints on the last day with work", () => {
  const sample = createSampleSheet();
  assert.equal(lastWorkedDay(sample), "saturday");
  sample.days.saturday = [];
  assert.equal(lastWorkedDay(sample), "wednesday");
  assert.equal(lastWorkedDay(createBlankSheet()), "sunday");
});

test("page numbers follow days with work, not a fixed seven", () => {
  const sample = createSampleSheet();
  assert.deepEqual(daysWorked(sample), [
    "monday",
    "tuesday",
    "wednesday",
    "saturday",
  ]);
  assert.deepEqual(sheetPage(sample, "monday", "monday"), {
    page: 1,
    pages: 4,
  });
  assert.deepEqual(sheetPage(sample, "wednesday", "monday"), {
    page: 3,
    pages: 4,
  });
  assert.deepEqual(sheetPage(sample, "saturday", "monday"), {
    page: 4,
    pages: 4,
  });
  assert.deepEqual(sheetPage(sample, "thursday", "monday"), {
    page: 0,
    pages: 4,
  });
  assert.deepEqual(printDays(createBlankSheet(), "tuesday"), ["tuesday"]);
  assert.deepEqual(sheetPage(createBlankSheet(), "tuesday", "tuesday"), {
    page: 1,
    pages: 1,
  });
  assert.deepEqual(packetDays(sample, "thursday", "day"), ["thursday"]);
  assert.deepEqual(packetDays(sample, "monday", "week"), [
    "monday",
    "tuesday",
    "wednesday",
    "saturday",
  ]);
});
