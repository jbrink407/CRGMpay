"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CLASSIFICATIONS,
  calculate,
  emptyJob,
  formatMoney,
  formatHoursTotal,
  parseNumber,
  type JobLine,
  type PaySheet,
} from "@/lib/pay-sheet";
import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

interface PaySheetFormProps {
  sheet: PaySheet;
  onChange: (sheet: PaySheet) => void;
}

export function PaySheetForm({ sheet, onChange }: PaySheetFormProps) {
  const totals = calculate(sheet);

  function patch(partial: Partial<PaySheet>) {
    onChange({ ...sheet, ...partial });
  }

  function updateJob(id: string, partial: Partial<JobLine>) {
    onChange({
      ...sheet,
      jobs: sheet.jobs.map((job) =>
        job.id === id ? { ...job, ...partial } : job,
      ),
    });
  }

  function removeJob(id: string) {
    const next = sheet.jobs.filter((job) => job.id !== id);
    onChange({
      ...sheet,
      jobs: next.length ? next : [emptyJob()],
    });
  }

  function addJob() {
    const last = sheet.jobs[sheet.jobs.length - 1];
    onChange({
      ...sheet,
      jobs: [
        ...sheet.jobs,
        emptyJob({
          date: last?.date ?? sheet.weekEnding,
        }),
      ],
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-8">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Who this sheet is for</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Classification prints in the header, the same way scanned sheets are
          named.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CLASSIFICATIONS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={sheet.classification === item ? "default" : "outline"}
              onClick={() => patch({ classification: item })}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Classification">
            <Input
              value={sheet.classification}
              onChange={(event) =>
                patch({ classification: event.target.value.toUpperCase() })
              }
            />
          </Field>
          <Field label="Employee name">
            <Input
              value={sheet.employeeName}
              onChange={(event) =>
                patch({ employeeName: event.target.value })
              }
              placeholder="Joseph Scott Kemper"
            />
          </Field>
          <Field label="Employee no.">
            <Input
              value={sheet.employeeNumber}
              onChange={(event) =>
                patch({ employeeNumber: event.target.value })
              }
            />
          </Field>
          <Field label="Week ending">
            <Input
              type="date"
              value={sheet.weekEnding}
              onChange={(event) => patch({ weekEnding: event.target.value })}
            />
          </Field>
          <Field label="Truck / crew">
            <Input
              value={sheet.truckOrCrew}
              onChange={(event) => patch({ truckOrCrew: event.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={sheet.employeePhone}
              onChange={(event) =>
                patch({ employeePhone: event.target.value })
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-sm font-medium">Jobs this week</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One row per job or work order. Daily hours and pay calculate from
              these lines.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addJob}>
            <Plus />
            Add job
          </Button>
        </div>

        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Date</th>
                <th className="pb-2 pr-2 font-medium">Job / customer</th>
                <th className="pb-2 pr-2 font-medium">Job no.</th>
                <th className="pb-2 pr-2 font-medium">Location</th>
                <th className="pb-2 pr-2 font-medium">ST</th>
                <th className="pb-2 pr-2 font-medium">OT</th>
                <th className="pb-2 pr-2 font-medium">DT</th>
                <th className="pb-2 pr-2 font-medium">Units</th>
                <th className="pb-2 pr-2 font-medium">Miles</th>
                <th className="pb-2 pr-2 font-medium">Notes</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sheet.jobs.map((job) => (
                <tr key={job.id} className="align-top">
                  <td className="py-1 pr-2">
                    <Input
                      type="date"
                      value={job.date}
                      onChange={(event) =>
                        updateJob(job.id, { date: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      value={job.customer}
                      onChange={(event) =>
                        updateJob(job.id, { customer: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      value={job.jobNumber}
                      onChange={(event) =>
                        updateJob(job.id, { jobNumber: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      value={job.location}
                      onChange={(event) =>
                        updateJob(job.id, { location: event.target.value })
                      }
                    />
                  </td>
                  <NumCell
                    value={job.regular}
                    onChange={(regular) => updateJob(job.id, { regular })}
                  />
                  <NumCell
                    value={job.overtime}
                    onChange={(overtime) => updateJob(job.id, { overtime })}
                  />
                  <NumCell
                    value={job.doubletime}
                    onChange={(doubletime) =>
                      updateJob(job.id, { doubletime })
                    }
                  />
                  <NumCell
                    value={job.units}
                    onChange={(units) => updateJob(job.id, { units })}
                  />
                  <NumCell
                    value={job.miles}
                    onChange={(miles) => updateJob(job.id, { miles })}
                  />
                  <td className="py-1 pr-2">
                    <Input
                      value={job.notes}
                      onChange={(event) =>
                        updateJob(job.id, { notes: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remove job"
                      onClick={() => removeJob(job.id)}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 lg:hidden">
          {sheet.jobs.map((job, index) => (
            <div
              key={job.id}
              className="rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/10"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Job {index + 1}
                </p>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Remove job"
                  onClick={() => removeJob(job.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date">
                  <Input
                    type="date"
                    value={job.date}
                    onChange={(event) =>
                      updateJob(job.id, { date: event.target.value })
                    }
                  />
                </Field>
                <Field label="Job no.">
                  <Input
                    value={job.jobNumber}
                    onChange={(event) =>
                      updateJob(job.id, { jobNumber: event.target.value })
                    }
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Job / customer">
                    <Input
                      value={job.customer}
                      onChange={(event) =>
                        updateJob(job.id, { customer: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Location">
                    <Input
                      value={job.location}
                      onChange={(event) =>
                        updateJob(job.id, { location: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Regular hrs">
                  <NumberInput
                    value={job.regular}
                    onChange={(regular) => updateJob(job.id, { regular })}
                  />
                </Field>
                <Field label="OT hrs">
                  <NumberInput
                    value={job.overtime}
                    onChange={(overtime) => updateJob(job.id, { overtime })}
                  />
                </Field>
                <Field label="DT hrs">
                  <NumberInput
                    value={job.doubletime}
                    onChange={(doubletime) =>
                      updateJob(job.id, { doubletime })
                    }
                  />
                </Field>
                <Field label="Units">
                  <NumberInput
                    value={job.units}
                    onChange={(units) => updateJob(job.id, { units })}
                  />
                </Field>
                <Field label="Miles">
                  <NumberInput
                    value={job.miles}
                    onChange={(miles) => updateJob(job.id, { miles })}
                  />
                </Field>
                <div className="col-span-2">
                  <Field label="Notes">
                    <Input
                      value={job.notes}
                      onChange={(event) =>
                        updateJob(job.id, { notes: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Rates and pay</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overtime defaults to 1.5× and double time to 2× the regular rate.
          Override either rate if payroll uses a posted figure.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Regular rate">
            <NumberInput
              value={sheet.regularRate}
              onChange={(regularRate) => patch({ regularRate })}
              money
            />
          </Field>
          <Field label="OT rate override">
            <NumberInput
              value={sheet.overtimeRateOverride ?? 0}
              onChange={(value) =>
                patch({ overtimeRateOverride: value || null })
              }
              money
            />
          </Field>
          <Field label="DT rate override">
            <NumberInput
              value={sheet.doubletimeRateOverride ?? 0}
              onChange={(value) =>
                patch({ doubletimeRateOverride: value || null })
              }
              money
            />
          </Field>
          <Field label="Mileage rate">
            <NumberInput
              value={sheet.mileageRate}
              onChange={(mileageRate) => patch({ mileageRate })}
              money
            />
          </Field>
          <Field label="Unit / piece rate">
            <NumberInput
              value={sheet.unitRate}
              onChange={(unitRate) => patch({ unitRate })}
              money
            />
          </Field>
          <Field label="Per diem">
            <NumberInput
              value={sheet.perDiem}
              onChange={(perDiem) => patch({ perDiem })}
              money
            />
          </Field>
          <Field label="Other earnings">
            <NumberInput
              value={sheet.otherEarnings}
              onChange={(otherEarnings) => patch({ otherEarnings })}
              money
            />
          </Field>
          <Field label="Other earnings label">
            <Input
              value={sheet.otherEarningsLabel}
              onChange={(event) =>
                patch({ otherEarningsLabel: event.target.value })
              }
            />
          </Field>
          <Field label="Draw / advance">
            <NumberInput
              value={sheet.draw}
              onChange={(draw) => patch({ draw })}
              money
            />
          </Field>
          <Field label="Chargebacks">
            <NumberInput
              value={sheet.chargebacks}
              onChange={(chargebacks) => patch({ chargebacks })}
              money
            />
          </Field>
          <Field label="Other deductions">
            <NumberInput
              value={sheet.otherDeductions}
              onChange={(otherDeductions) => patch({ otherDeductions })}
              money
            />
          </Field>
          <Field label="Other deductions label">
            <Input
              value={sheet.otherDeductionsLabel}
              onChange={(event) =>
                patch({ otherDeductionsLabel: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-4">
          <Stat label="Hours" value={formatHoursTotal(totals.totalHours)} />
          <Stat label="Gross" value={formatMoney(totals.gross)} />
          <Stat label="Deductions" value={formatMoney(totals.totalDeductions)} />
          <Stat label="Net" value={formatMoney(totals.net)} />
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Company on the form</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Company name">
            <Input
              value={sheet.companyName}
              onChange={(event) => patch({ companyName: event.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={sheet.companyPhone}
              onChange={(event) => patch({ companyPhone: event.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Textarea
                rows={2}
                value={sheet.companyAddress}
                onChange={(event) =>
                  patch({ companyAddress: event.target.value })
                }
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Remarks">
              <Textarea
                rows={3}
                value={sheet.remarks}
                onChange={(event) => patch({ remarks: event.target.value })}
                placeholder="Callouts, materials, or anything payroll needs to see."
              />
            </Field>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}

function NumCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <td className="w-20 py-1 pr-2">
      <NumberInput value={value} onChange={onChange} />
    </td>
  );
}

function NumberInput({
  value,
  onChange,
  money = false,
}: {
  value: number;
  onChange: (value: number) => void;
  money?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value ? String(value) : "");

  return (
    <Input
      inputMode="decimal"
      value={display}
      placeholder="0"
      className={money ? "text-right tabular-nums" : "tabular-nums"}
      onFocus={() => setDraft(value ? String(value) : "")}
      onBlur={() => {
        onChange(parseNumber(draft ?? ""));
        setDraft(null);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(parseNumber(event.target.value));
      }}
    />
  );
}
