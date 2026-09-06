import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_CODES, findCode } from "./job-codes";
import {
  applyWeekEnding,
  createBlankSheet,
  createSampleSheet,
  ensureSheet,
  formatUSDate,
  lineAmount,
  nextSaturday,
  pageTotal,
  pdfFilename,
  saturdayOfWeek,
  weeklyTotal,
  weekdayDate,
} from "./pay-sheet";

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

test("week ending Saturday maps Sunday–Saturday", () => {
  assert.equal(weekdayDate("2026-09-05", "sunday"), "2026-08-30");
  assert.equal(weekdayDate("2026-09-05", "monday"), "2026-08-31");
  assert.equal(weekdayDate("2026-09-05", "friday"), "2026-09-04");
  assert.equal(weekdayDate("2026-09-05", "saturday"), "2026-09-05");
  assert.equal(formatUSDate("2026-09-05"), "9/5/2026");
});

test("changing week ending updates auto dates", () => {
  const sheet = createSampleSheet();
  const next = applyWeekEnding(sheet, "2026-09-05");
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
  assert.equal(sheet.days.sunday[0].date, "2026-08-30");
  assert.equal(sheet.days.saturday[0].date, "2026-09-05");
});

test("saturday of week and next saturday", () => {
  assert.equal(saturdayOfWeek("2026-09-02"), "2026-09-05");
  assert.equal(nextSaturday("2026-09-05"), "2026-09-12");
});
