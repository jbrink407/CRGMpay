# CR Pay

A small web app for filling the Construction Resources Glass & Mirror **Payroll Detail Log** and printing it as a landscape PDF.

Live: [crgmpay.onrender.com](https://crgmpay.onrender.com)

The printed page follows `data/CR Pay Sheet.xlsx`: landscape log, piece-rate lines, labor-code lookup, page total, weekly total on the last day worked, and the policy footer. There is one printed page per day that has work.

Add lines as work happens. Each week is saved on this device, so Monday’s jobs are still there on Thursday.

## What it does

- Installer and helper names, week ending Sunday
- One entry page per day (Mon–Sun), up to 20 piece-work lines
- Columns match the spreadsheet: Date, Customer, Lot/Community or Address, Labor Code, Qty, PC Pay Rate, PC Pay Total, Comments. Mgr Apvl stays blank on the printout for handwritten initials.
- Rate looks up from the Job Codes list (`qty × rate`)
- **Download PDF** is a landscape letter PDF (`INSTALLER {name}.pdf`). Choose **This day** for the open day only (PAGE 1 OF 1) or **All days with work** for the week packet. Page numbers match that count.
- Weekend tabs remind you of Chuck / Stacy same-day text rules
- Job codes and builder names can be edited in collapsed lists (open to add, paste, or restore)

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

No account or database. Drafts, saved weeks, job codes, and builders stay in the browser.

## GitHub

Source: [github.com/jbrink407/CRGMpay](https://github.com/jbrink407/CRGMpay) (`main`).

## Deploy on Render

Production is [crgmpay.onrender.com](https://crgmpay.onrender.com). It is a Next.js **Web Service** (`render.yaml`): `npm ci && npm run build`, then `npm start` on `0.0.0.0` / `$PORT`.

Pushes to `main` on GitHub redeploy. No env secrets or database. Payroll drafts stay in the browser’s localStorage.

Free/starter instances can sleep after idle time; the first request after sleep may take a minute.

## Filling a week

1. Enter installer and helper.
2. Confirm week ending (Sunday). Changing it opens that week if you already started it.
3. Choose a day tab and add lines: customer, address, labor code, qty.
4. Close the laptop and come back later — the week is still there.
5. Download PDF or print when the week is done. Download PDF asks whether you want this day only or every day with work.

**New week** saves the current week and opens the next Sunday. Saved weeks appear as chips under the week-ending date — open one to continue, or trash it to remove it from this device (with confirmation). **Load sample** fills Joseph Scott Kemper / Joshua Brinker, including a Saturday line.

## Builders

Customer on each line is a dropdown of the company builder list (Adams Homes, D.R. Horton, Lennar Atlanta, and the rest). Pick one, or choose **Type a name…** for a builder that is not on the list. Typed names are remembered on this device. Open **Builders** to add, remove, or paste a list.

## Job codes

The starter list is the Job Codes tab from the company workbook (BHL, BORE, REKEY, FD791LAB, and the rest). Open **Job codes** to edit rates or paste an updated list.
