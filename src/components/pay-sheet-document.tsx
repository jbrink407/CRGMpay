import styles from "@/components/pay-sheet-document.module.css";
import {
  DAYS,
  DAY_LABELS,
  calculate,
  formatHours,
  formatHoursTotal,
  formatMoney,
  formatRate,
  formatUSDate,
  formatWeekdayDate,
  printedJobs,
  weekDates,
  type PaySheet,
} from "@/lib/pay-sheet";

interface PaySheetDocumentProps {
  sheet: PaySheet;
}

export function PaySheetDocument({ sheet }: PaySheetDocumentProps) {
  const totals = calculate(sheet);
  const dates = weekDates(sheet.weekEnding);
  const jobs = printedJobs(sheet, 10);

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.company}>{sheet.companyName || "COMPANY"}</div>
            <div className={styles.address}>
              {[sheet.companyAddress, sheet.companyPhone]
                .filter(Boolean)
                .join("\n") || " "}
            </div>
          </div>
          <div className={styles.titleBlock}>
            <div className={styles.formTitle}>{sheet.formTitle}</div>
            <div className={styles.formMeta}>Corporate payroll form · one page</div>
          </div>
        </header>

        <div className={styles.metaGrid}>
          <div className={styles.cell}>
            <span className={styles.label}>Classification</span>
            <div className={styles.value}>{sheet.classification || " "}</div>
          </div>
          <div className={`${styles.cell} ${styles.wide}`}>
            <span className={styles.label}>Employee name</span>
            <div className={`${styles.value} ${styles.valueNormal}`}>
              {sheet.employeeName || " "}
            </div>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>Employee no.</span>
            <div className={styles.value}>{sheet.employeeNumber || " "}</div>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>Week ending</span>
            <div className={`${styles.value} ${styles.valueNormal}`}>
              {formatUSDate(sheet.weekEnding) || " "}
            </div>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>Truck / crew</span>
            <div className={styles.value}>{sheet.truckOrCrew || " "}</div>
          </div>
          <div className={styles.cell}>
            <span className={styles.label}>Phone</span>
            <div className={`${styles.value} ${styles.valueNormal}`}>
              {sheet.employeePhone || " "}
            </div>
          </div>
        </div>

        <div className={styles.sectionHead}>Daily hours summary</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "14%" }} />
              {DAYS.map((day) => (
                <th key={day} className={styles.center}>
                  {DAY_LABELS[day]}
                  <div className={styles.muted}>{formatWeekdayDate(dates[day])}</div>
                </th>
              ))}
              <th className={styles.center} style={{ width: "10%" }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <HourRow
              label="Regular"
              values={DAYS.map((day) => totals.byDay[day].regular)}
              total={totals.regularHours}
            />
            <HourRow
              label="Overtime"
              values={DAYS.map((day) => totals.byDay[day].overtime)}
              total={totals.overtimeHours}
            />
            <HourRow
              label="Double time"
              values={DAYS.map((day) => totals.byDay[day].doubletime)}
              total={totals.doubletimeHours}
            />
            <HourRow
              label="Miles"
              values={DAYS.map((day) => totals.byDay[day].miles)}
              total={totals.miles}
            />
            <HourRow
              label="Total hours"
              values={DAYS.map((day) => totals.byDay[day].hours)}
              total={totals.totalHours}
              strong
            />
          </tbody>
        </table>

        <div className={styles.sectionHead}>Job / work order detail</div>
        <table className={`${styles.table} ${styles.jobTable}`}>
          <thead>
            <tr>
              <th style={{ width: "4%" }}>#</th>
              <th style={{ width: "11%" }}>Date</th>
              <th style={{ width: "24%" }}>Job / customer</th>
              <th style={{ width: "10%" }}>Job no.</th>
              <th style={{ width: "18%" }}>Location</th>
              <th style={{ width: "5%" }}>ST</th>
              <th style={{ width: "5%" }}>OT</th>
              <th style={{ width: "5%" }}>DT</th>
              <th style={{ width: "6%" }}>Units</th>
              <th style={{ width: "6%" }}>Miles</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, index) => (
              <tr key={job.id}>
                <td className={styles.center}>{index + 1}</td>
                <td>{formatUSDate(job.date)}</td>
                <td>{job.customer}</td>
                <td className={styles.center}>{job.jobNumber}</td>
                <td>{job.location}</td>
                <td className={styles.num}>{formatHours(job.regular)}</td>
                <td className={styles.num}>{formatHours(job.overtime)}</td>
                <td className={styles.num}>{formatHours(job.doubletime)}</td>
                <td className={styles.num}>{formatHours(job.units)}</td>
                <td className={styles.num}>{formatHours(job.miles)}</td>
                <td>{job.notes}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className={styles.num}>
                <strong>TOTALS</strong>
              </td>
              <td className={styles.num}>
                <strong>{formatHoursTotal(totals.regularHours)}</strong>
              </td>
              <td className={styles.num}>
                <strong>{formatHoursTotal(totals.overtimeHours)}</strong>
              </td>
              <td className={styles.num}>
                <strong>{formatHoursTotal(totals.doubletimeHours)}</strong>
              </td>
              <td className={styles.num}>
                <strong>{formatHoursTotal(totals.units)}</strong>
              </td>
              <td className={styles.num}>
                <strong>{formatHoursTotal(totals.miles)}</strong>
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className={styles.payWrap}>
          <div className={styles.payLeft}>
            <div className={styles.sectionHead}>Earnings</div>
            <PayLine
              label="Regular"
              qty={formatHoursTotal(totals.regularHours)}
              rate={formatRate(sheet.regularRate)}
              amount={formatMoney(totals.regularPay)}
            />
            <PayLine
              label="Overtime"
              qty={formatHoursTotal(totals.overtimeHours)}
              rate={formatRate(totals.overtimeRate)}
              amount={formatMoney(totals.overtimePay)}
            />
            <PayLine
              label="Double time"
              qty={formatHoursTotal(totals.doubletimeHours)}
              rate={formatRate(totals.doubletimeRate)}
              amount={formatMoney(totals.doubletimePay)}
            />
            <PayLine
              label="Mileage"
              qty={formatHoursTotal(totals.miles)}
              rate={formatRate(sheet.mileageRate)}
              amount={formatMoney(totals.mileagePay)}
            />
            {sheet.unitRate > 0 || totals.units > 0 ? (
              <PayLine
                label="Units / piece"
                qty={formatHoursTotal(totals.units)}
                rate={formatRate(sheet.unitRate)}
                amount={formatMoney(totals.unitPay)}
              />
            ) : null}
            <PayLine
              label="Per diem"
              qty=""
              rate=""
              amount={formatMoney(totals.perDiem)}
              hideTimes
            />
            <PayLine
              label={sheet.otherEarningsLabel || "Other"}
              qty=""
              rate=""
              amount={formatMoney(totals.otherEarnings)}
              hideTimes
            />
            <PayLine
              label="Gross pay"
              qty=""
              rate=""
              amount={formatMoney(totals.gross)}
              total
              hideTimes
            />
            <div className={styles.sectionHead}>Deductions</div>
            <PayLine
              label="Draw / advance"
              qty=""
              rate=""
              amount={formatMoney(totals.draw)}
              hideTimes
            />
            <PayLine
              label="Chargebacks"
              qty=""
              rate=""
              amount={formatMoney(totals.chargebacks)}
              hideTimes
            />
            <PayLine
              label={sheet.otherDeductionsLabel || "Other deductions"}
              qty=""
              rate=""
              amount={formatMoney(totals.otherDeductions)}
              hideTimes
            />
            <PayLine
              label="Net pay"
              qty=""
              rate=""
              amount={formatMoney(totals.net)}
              total
              hideTimes
            />
          </div>
          <div>
            <div className={styles.sectionHead}>Remarks</div>
            <div className={styles.remarks}>{sheet.remarks || " "}</div>
            <p className={styles.cert}>
              I certify that the hours, jobs, and information on this pay sheet
              are true and correct to the best of my knowledge.
            </p>
          </div>
        </div>

        <div className={styles.signGrid}>
          <div className={styles.signBox}>
            <div className={styles.label}>Employee signature</div>
            <div className={styles.signLine}>
              <span>Signature</span>
              <span>Date</span>
            </div>
          </div>
          <div className={styles.signBox}>
            <div className={styles.label}>Supervisor approval</div>
            <div className={styles.signLine}>
              <span>Signature</span>
              <span>Date</span>
            </div>
          </div>
        </div>

        <div className={styles.payroll}>
          <div className={styles.payrollTitle}>For payroll use only</div>
          <div className={styles.payrollGrid}>
            <div>
              <span className={styles.label}>Processed by</span>
              <div className={styles.blankLine} />
            </div>
            <div>
              <span className={styles.label}>Check / batch no.</span>
              <div className={styles.blankLine} />
            </div>
            <div>
              <span className={styles.label}>Date paid</span>
              <div className={styles.blankLine} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HourRow({
  label,
  values,
  total,
  strong = false,
}: {
  label: string;
  values: number[];
  total: number;
  strong?: boolean;
}) {
  const Cell = strong ? "strong" : "span";
  return (
    <tr>
      <td>
        <Cell>{label}</Cell>
      </td>
      {values.map((value, index) => (
        <td key={`${label}-${index}`} className={styles.num}>
          <Cell>{formatHours(value)}</Cell>
        </td>
      ))}
      <td className={styles.num}>
        <Cell>{formatHoursTotal(total)}</Cell>
      </td>
    </tr>
  );
}

function PayLine({
  label,
  qty,
  rate,
  amount,
  total = false,
  hideTimes = false,
}: {
  label: string;
  qty: string;
  rate: string;
  amount: string;
  total?: boolean;
  hideTimes?: boolean;
}) {
  return (
    <div className={`${styles.payRow} ${total ? styles.totalRow : ""}`}>
      <span className={styles.lab}>{label}</span>
      <span className={styles.num}>{hideTimes ? "" : qty}</span>
      <span className={styles.center}>{hideTimes || !qty ? "" : "×"}</span>
      <span className={styles.num}>{hideTimes ? "" : rate}</span>
      <span className={styles.center}>{hideTimes && !total ? "" : "="}</span>
      <span className={styles.num}>{amount}</span>
    </div>
  );
}
