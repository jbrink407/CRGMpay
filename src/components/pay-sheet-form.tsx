"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyCode,
  parseCodeCsv,
  type PieceCode,
} from "@/lib/job-codes";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  applyCodeToLine,
  emptyJob,
  formatMoney,
  lineAmount,
  pageTotal,
  parseNumber,
  weekdayDate,
  type JobLine,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";
import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

interface PaySheetFormProps {
  sheet: PaySheet;
  codes: PieceCode[];
  day: Weekday;
  onDayChange: (day: Weekday) => void;
  onChange: (sheet: PaySheet) => void;
  onCodesChange: (codes: PieceCode[]) => void;
}

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PaySheetForm({
  sheet,
  codes,
  day,
  onDayChange,
  onChange,
  onCodesChange,
}: PaySheetFormProps) {
  const [importText, setImportText] = useState("");
  const lines = sheet.days[day];

  function patch(partial: Partial<PaySheet>) {
    onChange({ ...sheet, ...partial });
  }

  function setLines(next: JobLine[]) {
    onChange({
      ...sheet,
      days: { ...sheet.days, [day]: next },
    });
  }

  function updateLine(id: string, partial: Partial<JobLine>) {
    setLines(lines.map((line) => (line.id === id ? { ...line, ...partial } : line)));
  }

  function setLineCode(id: string, code: string) {
    setLines(
      lines.map((line) =>
        line.id === id ? applyCodeToLine(line, code, codes) : line,
      ),
    );
  }

  function addLine(sameJob = false) {
    const last = lines[lines.length - 1];
    const date = weekdayDate(sheet.weekEnding, day);
    setLines([
      ...lines,
      emptyJob(
        sameJob && last
          ? {
              date: last.date || date,
              customer: last.customer,
              address: last.address,
            }
          : { date: last?.date || date },
      ),
    ]);
  }

  function updateCode(index: number, partial: Partial<PieceCode>) {
    onCodesChange(
      codes.map((item, i) => (i === index ? { ...item, ...partial } : item)),
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 lg:pb-8">
      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Header</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prints as INSTALLER / HELPER on the Payroll Detail Log.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Installer">
            <Input
              value={sheet.installerName}
              onChange={(event) =>
                patch({ installerName: event.target.value })
              }
              placeholder="Joseph Scott Kemper"
            />
          </Field>
          <Field label="Helper">
            <Input
              value={sheet.helperName}
              onChange={(event) => patch({ helperName: event.target.value })}
              placeholder="Joshua Brinker"
            />
          </Field>
          <Field label="Week ending">
            <Input
              type="date"
              value={sheet.weekEnding}
              onChange={(event) => patch({ weekEnding: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-sm font-medium">Piece work</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One log page per weekday, 20 lines each. Pick a labor code and
              enter qty — PC pay rate looks up from Job Codes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addLine(true)}
            >
              Same job, another code
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addLine(false)}>
              <Plus />
              Add line
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={day === item ? "default" : "outline"}
              onClick={() => onDayChange(item)}
            >
              {WEEKDAY_LABELS[item]}
              <span className="tabular-nums opacity-70">
                {formatMoney(pageTotal(sheet.days[item]))}
              </span>
            </Button>
          ))}
        </div>

        <div className="mt-4 hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Date</th>
                <th className="pb-2 pr-2 font-medium">Customer</th>
                <th className="pb-2 pr-2 font-medium">Lot / community or address</th>
                <th className="pb-2 pr-2 font-medium">Labor code</th>
                <th className="pb-2 pr-2 font-medium">Qty</th>
                <th className="pb-2 pr-2 font-medium">PC pay rate</th>
                <th className="pb-2 pr-2 font-medium">PC pay total</th>
                <th className="pb-2 pr-2 font-medium">Comments</th>
                <th className="pb-2 pr-2 font-medium">Mgr</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="align-top">
                  <td className="w-32 py-1 pr-2">
                    <Input
                      type="date"
                      value={line.date}
                      onChange={(event) =>
                        updateLine(line.id, { date: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      value={line.customer}
                      onChange={(event) =>
                        updateLine(line.id, { customer: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      value={line.address}
                      onChange={(event) =>
                        updateLine(line.id, { address: event.target.value })
                      }
                    />
                  </td>
                  <td className="w-40 py-1 pr-2">
                    <select
                      className={selectClassName}
                      value={line.code}
                      onChange={(event) =>
                        setLineCode(line.id, event.target.value)
                      }
                    >
                      <option value="">Labor code</option>
                      {codes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} · {formatMoney(item.rate)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="w-20 py-1 pr-2">
                    <NumberInput
                      value={line.qty}
                      onChange={(qty) => updateLine(line.id, { qty })}
                    />
                  </td>
                  <td className="w-24 py-1 pr-2">
                    <NumberInput
                      value={line.rate}
                      onChange={(rate) => updateLine(line.id, { rate })}
                      money
                    />
                  </td>
                  <td className="w-24 py-1 pr-2 text-right text-sm tabular-nums">
                    {formatMoney(lineAmount(line))}
                  </td>
                  <td className="py-1 pr-2">
                    <Input
                      value={line.comments}
                      onChange={(event) =>
                        updateLine(line.id, { comments: event.target.value })
                      }
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={line.mgrApproved}
                      onChange={(event) =>
                        updateLine(line.id, {
                          mgrApproved: event.target.checked,
                        })
                      }
                      aria-label="Manager approval"
                    />
                  </td>
                  <td className="py-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remove line"
                      onClick={() =>
                        setLines(
                          lines.length > 1
                            ? lines.filter((item) => item.id !== line.id)
                            : [emptyJob({ date: weekdayDate(sheet.weekEnding, day) })],
                        )
                      }
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
          {lines.map((line, index) => (
            <div
              key={line.id}
              className="rounded-lg bg-muted/40 p-3 ring-1 ring-foreground/10"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Line {index + 1}
                </p>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Remove line"
                  onClick={() =>
                    setLines(
                      lines.length > 1
                        ? lines.filter((item) => item.id !== line.id)
                        : [emptyJob({ date: weekdayDate(sheet.weekEnding, day) })],
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date">
                  <Input
                    type="date"
                    value={line.date}
                    onChange={(event) =>
                      updateLine(line.id, { date: event.target.value })
                    }
                  />
                </Field>
                <Field label="Labor code">
                  <select
                    className={selectClassName}
                    value={line.code}
                    onChange={(event) =>
                      setLineCode(line.id, event.target.value)
                    }
                  >
                    <option value="">Labor code</option>
                    {codes.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} · {formatMoney(item.rate)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Customer">
                    <Input
                      value={line.customer}
                      onChange={(event) =>
                        updateLine(line.id, { customer: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Lot / community or address">
                    <Input
                      value={line.address}
                      onChange={(event) =>
                        updateLine(line.id, { address: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Qty">
                  <NumberInput
                    value={line.qty}
                    onChange={(qty) => updateLine(line.id, { qty })}
                  />
                </Field>
                <Field label="PC pay rate">
                  <NumberInput
                    value={line.rate}
                    onChange={(rate) => updateLine(line.id, { rate })}
                    money
                  />
                </Field>
                <Field label="PC pay total">
                  <p className="flex h-8 items-center text-sm tabular-nums">
                    {formatMoney(lineAmount(line))}
                  </p>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={line.mgrApproved}
                    onChange={(event) =>
                      updateLine(line.id, { mgrApproved: event.target.checked })
                    }
                  />
                  Mgr apvl
                </label>
                <div className="col-span-2">
                  <Field label="Comments">
                    <Input
                      value={line.comments}
                      onChange={(event) =>
                        updateLine(line.id, { comments: event.target.value })
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
        <h2 className="font-heading text-sm font-medium">Job codes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          From the Job Codes tab. Paste an updated list as CODE, RATE.
        </p>
        <div className="mt-3 max-h-64 overflow-auto rounded-lg ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">Code</th>
                <th className="px-2 py-2 font-medium">Rate</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {codes.map((item, index) => (
                <tr key={`${item.code}-${index}`} className="border-t">
                  <td className="px-2 py-1">
                    <Input
                      value={item.code}
                      onChange={(event) =>
                        updateCode(index, {
                          code: event.target.value.toUpperCase(),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberInput
                      value={item.rate}
                      onChange={(rate) => updateCode(index, { rate })}
                      money
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${item.code}`}
                      onClick={() =>
                        onCodesChange(codes.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCodesChange([...codes, emptyCode()])}
          >
            <Plus />
            Add code
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          <Field label="Paste codes (CODE, RATE — one per line)">
            <Textarea
              rows={4}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={"BHL, 1.64\nBORE, 10.25\nREKEY, 20.50"}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const parsed = parseCodeCsv(importText);
              if (parsed.length) {
                onCodesChange(parsed);
                setImportText("");
              }
            }}
          >
            Replace list from paste
          </Button>
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
