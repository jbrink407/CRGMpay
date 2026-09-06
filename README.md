# CRGM Pay

A small web app for filling the company **Payroll Detail Log** and printing it as a landscape PDF.

The printed page follows `data/CR Pay Sheet.xlsx`: landscape log, piece-rate lines, labor-code lookup, page total, Sunday weekly total, and the policy footer. There is one page per day, Monday through Sunday.

Add lines as work happens. Each week is saved on this device, so Monday’s jobs are still there on Thursday.

## What it does

- Installer and helper names, week ending Sunday
- One page per day (Sun–Sat), up to 20 piece-work lines
- Columns match the spreadsheet: Date, Customer, Lot/Community or Address, Labor Code, Qty, PC Pay Rate, PC Pay Total, Comments. Mgr Apvl stays blank on the printout for handwritten initials.
- Rate looks up from the Job Codes list (`qty × rate`)
- **Download PDF** is a 7-page landscape letter packet (`INSTALLER {name}.pdf`)
- Weekend tabs remind you of Chuck / Stacy same-day text rules
- Job codes and rates can be edited or replaced by pasting `CODE, RATE`

## Run locally

```bash
npm install
npm run dev
```

Open the URL from the terminal (this project uses port 43180).

```bash
npm run build
npm start
```

No account or database. Drafts, saved weeks, and codes stay in the browser.

## Filling a week

1. Enter installer and helper.
2. Confirm week ending (Sunday). Changing it opens that week if you already started it.
3. Choose a day tab and add lines: customer, address, labor code, qty.
4. Close the laptop and come back later — the week is still there.
5. Download PDF or print all seven pages when the week is done.

**New week** saves the current week and opens the next Sunday. **Load sample** fills Joseph Scott Kemper / Joshua Brinker, including a Saturday line.

## Job codes

The starter list is the Job Codes tab from the company workbook (BHL, BORE, REKEY, FD791LAB, and the rest). Paste an updated list anytime.
