import styles from "@/components/pay-sheet-document.module.css";
import {
  POLICY_FOOTER,
  POLICY_LINES,
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
import type { ReactNode } from "react";

interface PaySheetDocumentProps {
  sheet: PaySheet;
  day: Weekday;
  page: number;
  pages: number;
  showWeeklyTotal?: boolean;
}

/** html2canvas ignores table-cell padding for text nodes; wrap glyphs so PDF capture can nudge them. */
function Ink({ children }: { children: ReactNode }) {
  if (children == null || children === "") return null;
  return <span data-ink>{children}</span>;
}

export function PaySheetDocument({
  sheet,
  day,
  page,
  pages,
  showWeeklyTotal = false,
}: PaySheetDocumentProps) {
  const dayLines = sheet.days[day] ?? [];
  const lines = printedJobs(dayLines, 20);
  const total = pageTotal(dayLines);
  const week = showWeeklyTotal ? weeklyTotal(sheet) : 0;

  return (
    <div className={styles.page} data-print-root>
      <table className={styles.sheet}>
        <colgroup>
          <col style={{ width: "7.4%" }} />
          <col style={{ width: "8.4%" }} />
          <col style={{ width: "10.4%" }} />
          <col style={{ width: "6.8%" }} />
          <col style={{ width: "7.6%" }} />
          <col style={{ width: "7.5%" }} />
          <col style={{ width: "8.0%" }} />
          <col style={{ width: "3.5%" }} />
          <col style={{ width: "7.9%" }} />
          <col style={{ width: "8.6%" }} />
          <col style={{ width: "6.4%" }} />
          <col style={{ width: "6.0%" }} />
          <col style={{ width: "5.2%" }} />
          <col style={{ width: "6.2%" }} />
        </colgroup>
        <tbody>
          <tr className={styles.header}>
            <td className={`${styles.installer} ${styles.thick}`} colSpan={3}>
              <Ink>
                INSTALLER: {sheet.installerName || " "}
                <br />
                HELPER: {sheet.helperName || " "}
              </Ink>
            </td>
            <td className={`${styles.title} ${styles.thick}`} colSpan={6}>
              <Ink>PAYROLL DETAIL LOG</Ink>
            </td>
            <td className={`${styles.weekEndingLabel} ${styles.thick}`}>
              <Ink>Week Ending:</Ink>
            </td>
            <td className={`${styles.weekEndingValue} ${styles.thick}`} colSpan={4}>
              <Ink>{formatUSDate(sheet.weekEnding)}</Ink>
            </td>
          </tr>
          <tr>
            <td className={styles.head}>
              <Ink>DATE</Ink>
            </td>
            <td className={styles.head} colSpan={2}>
              <Ink>CUSTOMER</Ink>
            </td>
            <td className={styles.head} colSpan={3}>
              <Ink>LOT/COMMUNITY or ADDRESS</Ink>
            </td>
            <td className={styles.head}>
              <Ink>LABOR CODE</Ink>
            </td>
            <td className={styles.head}>
              <Ink>QTY</Ink>
            </td>
            <td className={styles.head}>
              <Ink>PC PAY RATE</Ink>
            </td>
            <td className={styles.head}>
              <Ink>PC PAY TOTAL</Ink>
            </td>
            <td className={styles.head} colSpan={3}>
              <Ink>COMMENTS</Ink>
            </td>
            <td className={styles.head}>
              <Ink>MGR APVL</Ink>
            </td>
          </tr>
          {lines.map((line) => (
            <tr key={line.id} className={styles.row}>
              <td className={styles.center}>
                <Ink>{formatUSDate(line.date)}</Ink>
              </td>
              <td colSpan={2}>
                <Ink>{line.customer}</Ink>
              </td>
              <td colSpan={3}>
                <Ink>{line.address}</Ink>
              </td>
              <td className={styles.center}>
                <Ink>{line.code}</Ink>
              </td>
              <td className={styles.num}>
                <Ink>{formatQty(line.qty)}</Ink>
              </td>
              <td className={styles.num}>
                <Ink>{formatRate(line.rate)}</Ink>
              </td>
              <td className={styles.num}>
                <Ink>
                  {line.qty || line.rate ? formatMoney(lineAmount(line), true) : ""}
                </Ink>
              </td>
              <td colSpan={3}>
                <Ink>{line.comments}</Ink>
              </td>
              <td className={styles.approval} />
            </tr>
          ))}
          <tr>
            <td className={styles.pageTotalPad} colSpan={8} />
            <td className={styles.pageTotalLabel}>
              <Ink>PAGE TOTAL</Ink>
            </td>
            <td className={styles.pageTotalValue}>
              <Ink>{formatMoney(total)}</Ink>
            </td>
            <td className={styles.pageTotalPad} colSpan={4} />
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[0]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[1]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>
              <Ink>{POLICY_LINES[2]}</Ink>
            </td>
            <td className={styles.pageNumLabel}>
              <Ink>PAGE</Ink>
            </td>
            <td className={styles.pageNumBox}>
              <Ink>{page || ""}</Ink>
            </td>
            <td className={styles.pageNumLabel}>
              <Ink>OF</Ink>
            </td>
            <td className={styles.pageNumBox}>
              <Ink>{pages}</Ink>
            </td>
            <td className={styles.pageNumLabel}>
              <Ink>PAGES</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={9}>
              <Ink>{POLICY_LINES[3]}</Ink>
            </td>
            <td className={styles.weekly}>
              <Ink>
                WEEKLY
                <br />
                TOTAL
              </Ink>
            </td>
            <td className={styles.weeklyValue} colSpan={4}>
              <Ink>{showWeeklyTotal ? formatMoney(week) : ""}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[4]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[5]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[6]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[7]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[8]}</Ink>
            </td>
          </tr>
          <tr className={styles.rules}>
            <td colSpan={14}>
              <Ink>{POLICY_LINES[9]}</Ink>
            </td>
          </tr>
          <tr>
            <td className={styles.footer} colSpan={14}>
              <Ink>{POLICY_FOOTER}</Ink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
