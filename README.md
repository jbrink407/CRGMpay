# CRGM Pay

A small web app for filling the company **Payroll Detail Log** and printing it as a landscape PDF.

The printed page follows `CR Pay Sheet.xlsx`: one log per weekday (Monday–Friday), piece-rate lines, labor-code lookup, page total, Friday weekly total, and the policy footer.

Data entry stays in a normal form. Totals calculate as you type.

## What it does

- Installer and helper names, week ending
- One page per weekday, up to 20 piece-work lines
- Columns match the spreadsheet: Date, Customer, Lot/Community or Address, Labor Code, Qty, PC Pay Rate, PC Pay Total, Comments, Mgr Apvl
- Rate looks up from the Job Codes list when you pick a labor code (`qty × rate`)
- **Download PDF** is a 5-page landscape letter packet (`INSTALLER {name}.pdf`)
- Job codes and rates can be edited or replaced by pasting `CODE, RATE`

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL from the terminal (this project uses port 43180).

```bash
npm run build
npm start
```

No account or database. Drafts and codes stay in the browser.

## Filling a week

1. Enter installer and helper.
2. Set week ending (Saturday).
3. Choose a weekday tab and add lines: customer, address, labor code, qty.
4. Download PDF or print all five pages.

**Load sample** fills Joseph Scott Kemper / Joshua Brinker with a few piece-rate lines.

## Job codes

The starter list is the Job Codes tab from the company workbook (BHL, BORE, REKEY, FD791LAB, and the rest). Paste an updated list anytime.
