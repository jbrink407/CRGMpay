import assert from "node:assert/strict";
import test from "node:test";
import { fitToLetterLandscape, PDF_TEXT_NUDGE_PX } from "./pdf";

test("letter-landscape fit keeps a tall capture on one page", () => {
  const box = fitToLetterLandscape(1100, 1200, 11, 8.5, 0.06);
  assert.ok(box.height <= 8.5 - 0.11);
  assert.ok(box.width <= 11);
  assert.ok(box.x >= 0 && box.y >= 0);
  assert.ok(box.x + box.width <= 11 + 1e-9);
  assert.ok(box.y + box.height <= 8.5 + 1e-9);
});

test("letter-landscape fit uses full width for a matching 11x8.5 capture", () => {
  const box = fitToLetterLandscape(2200, 1700, 11, 8.5, 0.06);
  assert.ok(Math.abs(box.width - (11 - 0.12)) < 0.05 || Math.abs(box.height - (8.5 - 0.12)) < 0.05);
  assert.ok(box.width <= 11 - 0.12 + 1e-9);
  assert.ok(box.height <= 8.5 - 0.12 + 1e-9);
});

test("PDF capture does not apply a full-row text nudge", () => {
  assert.ok(PDF_TEXT_NUDGE_PX >= 0 && PDF_TEXT_NUDGE_PX < 8);
});
