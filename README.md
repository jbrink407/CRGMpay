# CRGM Pay

A small web app for filling a **corporate weekly pay sheet** and printing it as a one-page PDF.

The company form is awkward by design. This app keeps that printable layout, and moves the painful part — typing jobs, hours, and rates — into a normal form. Totals, overtime, mileage, and net pay calculate as you type.

## What it does

- Enter installer (or other classification) details, week ending, and one row per job
- Daily hours roll up from those job rows
- Regular, overtime (1.5×), double time (2×), mileage, piece units, per diem, draws, and chargebacks calculate automatically
- Live preview of the one-page corporate sheet
- **Download PDF** or **Print** (Save as PDF from the print dialog)
- PDF file name matches the usual scan style, for example `INSTALLER Joseph Scott Kemper.pdf`
- Drafts save in the browser so a half-finished sheet is still there after refresh

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

No account or database. Everything stays in the browser.

## Filling a sheet

1. Pick a classification and enter the employee name.
2. Set week ending (Saturday is typical).
3. Add job rows: date, customer, job number, location, ST / OT / DT hours, miles.
4. Enter the regular rate. Overtime and double time fill from 1.5× and 2× unless you override them.
5. Download PDF or print.

**Load sample** fills a completed installer sheet so you can see the printed form without typing.

## Notes on the original form

The Excel workbook and the scanned original live on a local machine and were not available while this app was built. The printed page follows a typical corporate installer pay sheet: classification and name in the header, a seven-day hour grid, job detail lines, a pay recap, signatures, and a payroll-only block.

If you attach `CR Pay Sheet.xlsx` or the original scan, the layout can be lined up cell-for-cell with the required form.
