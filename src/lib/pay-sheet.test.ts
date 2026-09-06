import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_CODES, findCode } from "./job-codes";
import {
  applyWeekEnding,
  createSampleSheet,
  formatUSDate,
  lineAmount,
  pageTotal,
  pdfFilename,
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
  assert.equal(weeklyTotal(sheet), 184.33);
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
      mgrApproved: false,
    }),
    20.5,
  );
});

test("week ending Saturday maps Mon–Fri workdays", () => {
  assert.equal(weekdayDate("2026-09-05", "monday"), "2026-08-31");
  assert.equal(weekdayDate("2026-09-05", "friday"), "2026-09-04");
  assert.equal(formatUSDate("2026-09-05"), "9/5/2026");
});

test("changing week ending updates auto dates", () => {
  const sheet = createSampleSheet();
  const next = applyWeekEnding(sheet, "2026-09-05");
  assert.equal(next.days.monday[0].date, "2026-08-31");
  assert.equal(next.days.monday[0].customer, "Henderson");
});
