import styles from "@/components/pay-sheet-document.module.css";
import {
  POLICY_FOOTER,
  POLICY_LINES,
  WEEKDAY_LABELS,
  formatMoney,
  formatQty,
  formatRate,
  formatUSDate,
  lineAmount,
  pageTotal,
  printedJobs,
  weeklyTotal,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";

interface PaySheetDocumentProps {
  sheet: PaySheet;
  day: Weekday;
  page: number;
  pages: number;
  showWeeklyTotal?: boolean;
}

export function PaySheetDocument({
  sheet,
  day,
  page,
  pages,
  showWeeklyTotal = false,
}: PaySheetDocumentProps) {
  const lines = printedJobs(sheet.days[day], 20);
  const total = pageTotal(sheet.days[day]);
  const week = showWeeklyTotal ? weeklyTotal(sheet) : 0;

  return (
    <div className={styles.page}>
      <table className={styles.sheet}>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "3%" }} />
          <col style={{ width: "3%" }} />
          <col style={{ width: "4%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td className={`${styles.installer} ${styles.thick}`} colSpan={3}>
              INSTALLER: {sheet.installerName || " "}
            </td>
            <td className={`${styles.title} ${styles.thick}`} colSpan={6} rowSpan={2}>
              PAYROLL DETAIL LOG
            </td>
            <td className={`${styles.bold} ${styles.thick}`}>Week Ending:</td>
            <td className={`${styles.center} ${styles.thick}`} colSpan={4}>
              {formatUSDate(sheet.weekEnding)}
              {sheet.weekEnding ? `  (${WEEKDAY_LABELS[day]})` : ""}
            </td>
          </tr>
          <tr>
            <td className={`${styles.helperLabel} ${styles.thick}`}>HELPER:</td>
            <td className={`${styles.helperName} ${styles.thick}`} colSpan={2}>
              {sheet.helperName || " "}
            </td>
            <td className={styles.thick} />
            <td className={styles.thick} colSpan={4} />
          </tr>
          <tr>
            <td className={styles.head}>DATE</td>
            <td className={styles.head} colSpan={2}>
              CUSTOMER
            </td>
            <td className={styles.head} colSpan={3}>
              LOT/COMMUNITY or ADDRESS
            </td>
            <td className={styles.head}>LABOR CODE</td>
            <td className={styles.head}>QTY</td>
            <td className={styles.head}>PC PAY RATE</td>
            <td className={styles.head}>PC PAY TOTAL</td>
            <td className={styles.head} colSpan={3}>
              COMMENTS
            </td>
            <td className={styles.head}>MGR APVL</td>
          </tr>
          {lines.map((line) => (
            <tr key={line.id} className={styles.row}>
              <td className={styles.center}>{formatUSDate(line.date)}</td>
              <td colSpan={2}>{line.customer}</td>
              <td colSpan={3}>{line.address}</td>
              <td className={styles.center}>{line.code}</td>
              <td className={styles.num}>{formatQty(line.qty)}</td>
              <td className={styles.num}>{formatRate(line.rate)}</td>
              <td className={styles.num}>
                {line.qty || line.rate ? formatMoney(lineAmount(line), true) : ""}
              </td>
              <td colSpan={3}>{line.comments}</td>
              <td>
                <div className={styles.box}>{line.mgrApproved ? "X" : ""}</div>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={8} />
            <td className={styles.pageTotalLabel}>PAGE TOTAL</td>
            <td className={styles.pageTotalValue}>
              {formatMoney(total)}
            </td>
            <td colSpan={4} />
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>{POLICY_LINES[0]}</td>
            <td colSpan={5} />
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>{POLICY_LINES[1]}</td>
            <td colSpan={5} />
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>{POLICY_LINES[2]}</td>
            <td className={`${styles.right} ${styles.pageNum}`} colSpan={1}>
              PAGE
            </td>
            <td className={`${styles.center} ${styles.pageNum}`}>{page}</td>
            <td className={`${styles.center} ${styles.pageNum}`}>OF</td>
            <td className={`${styles.center} ${styles.pageNum}`}>{pages}</td>
            <td className={styles.pageNum}>PAGES</td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>{POLICY_LINES[3]}</td>
            <td className={styles.weekly} rowSpan={2}>
              WEEKLY
              <br />
              TOTAL
            </td>
            <td className={styles.weeklyValue} colSpan={4} rowSpan={2}>
              {showWeeklyTotal ? formatMoney(week) : ""}
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>{POLICY_LINES[4]}</td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>{POLICY_LINES[5]}</td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>{POLICY_LINES[6]}</td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>{POLICY_LINES[7]}</td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>{POLICY_LINES[8]}</td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>{POLICY_LINES[9]}</td>
          </tr>
          <tr>
            <td className={styles.footer} colSpan={14}>
              {POLICY_FOOTER}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
