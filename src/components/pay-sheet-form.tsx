"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyCode,
  parseCodeCsv,
  STARTER_CODES,
  type PieceCode,
} from "@/lib/job-codes";
import {
  STARTER_CUSTOMERS,
  emptyCustomer,
  findCustomer,
  parseCustomerList,
  rememberCustomer,
  type Customer,
} from "@/lib/customers";
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  applyCodeToLine,
  emptyJob,
  formatMoney,
  formatUSDate,
  isWeekend,
  lineAmount,
  pageTotal,
  parseNumber,
  weekdayDate,
  type JobLine,
  type PaySheet,
  type Weekday,
} from "@/lib/pay-sheet";
import { type WeekSummary } from "@/lib/storage";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PaySheetFormProps {
  sheet: PaySheet;
  codes: PieceCode[];
  day: Weekday;
  weeks: WeekSummary[];
  onDayChange: (day: Weekday) => void;
  onChange: (sheet: PaySheet) => void;
  onCodesChange: (codes: PieceCode[]) => void;
  customers: Customer[];
  onCustomersChange: (customers: Customer[]) => void;
  onWeekEndingChange: (weekEnding: string) => void;
  onOpenWeek: (weekEnding: string) => void;
  onDeleteWeek: (weekEnding: string) => void;
}

const selectClassName =
  "h-11 w-full max-w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm";

export function PaySheetForm({
  sheet,
  codes,
  day,
  weeks,
  onDayChange,
  onChange,
  onCodesChange,
  customers,
  onCustomersChange,
  onWeekEndingChange,
  onOpenWeek,
  onDeleteWeek,
}: PaySheetFormProps) {
  const [importText, setImportText] = useState("");
  const [importCustomers, setImportCustomers] = useState("");
  const focusCodeId = useRef<string | null>(null);
  const focusCustomerId = useRef<string | null>(null);
  const lines = sheet.days[day] ?? [];

  useEffect(() => {
    const id = focusCodeId.current;
    if (!id) return;
    focusCodeId.current = null;
    const node = document.getElementById(`job-code-${id}`) as HTMLInputElement | null;
    node?.focus();
    node?.scrollIntoView({ block: "center" });
  }, [codes]);

  useEffect(() => {
    const id = focusCustomerId.current;
    if (!id) return;
    focusCustomerId.current = null;
    const node = document.getElementById(`builder-name-${id}`) as HTMLInputElement | null;
    node?.focus();
    node?.scrollIntoView({ block: "center" });
  }, [customers]);

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

  function updateCustomer(index: number, partial: Partial<Customer>) {
    onCustomersChange(
      customers.map((item, i) => (i === index ? { ...item, ...partial } : item)),
    );
  }

  function setCustomer(lineId: string, name: string) {
    updateLine(lineId, { customer: name });
  }

  function remember(name: string) {
    onCustomersChange(rememberCustomer(customers, name));
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-24 lg:pb-8">
      <section className="min-w-0 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-heading text-sm font-medium">Header</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Prints as INSTALLER / HELPER. Come back tomorrow — this week stays on
          this device.
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
          <Field label="Week ending (Sunday)">
            <Input
              type="date"
              value={sheet.weekEnding}
              onChange={(event) => onWeekEndingChange(event.target.value)}
            />
          </Field>
        </div>
        {weeks.length > 1 ? (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">
              Saved weeks · tap a date to open, trash to remove from this device
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {weeks.map((item) => {
                const current = item.weekEnding === sheet.weekEnding;
                const variant = current ? "default" : "outline";
                return (
                  <div
                    key={item.weekEnding}
                    className="inline-flex max-w-full items-stretch"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant={variant}
                      className="max-md:h-11 rounded-r-none"
                      onClick={() => onOpenWeek(item.weekEnding)}
                    >
                      {formatUSDate(item.weekEnding)}
                      <span className="tabular-nums opacity-70">
                        {formatMoney(item.total)}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant={variant}
                      className="max-md:size-11 rounded-l-none border-l-0"
                      aria-label={`Remove week ending ${formatUSDate(item.weekEnding)}`}
                      onClick={() => onDeleteWeek(item.weekEnding)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="min-w-0 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-medium">Piece work</h2>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              One page per day, Monday through Sunday. Fill a few lines
              now and the rest later — nothing is lost when you close the tab.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="max-md:h-11"
              onClick={() => addLine(true)}
            >
              Same job, another code
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="max-md:h-11"
              onClick={() => addLine(false)}
            >
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
              className={`max-md:h-11 ${
                isWeekend(item) && day !== item ? "border-amber-700/40" : ""
              }`}
              onClick={() => onDayChange(item)}
            >
              <span className="sm:hidden">{WEEKDAY_SHORT[item]}</span>
              <span className="hidden sm:inline">{WEEKDAY_LABELS[item]}</span>
              <span className="tabular-nums opacity-70">
                {formatMoney(pageTotal(sheet.days[item] ?? []))}
              </span>
            </Button>
          ))}
        </div>
        {isWeekend(day) ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-700/20">
            Weekend work must be pre-approved by Charles Wiggins. Text the pay
            sheet and punch corrections to Chuck (404-449-2378) and Stacy
            (404-379-7870) the same day.
          </p>
        ) : null}

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
                  <td className="min-w-[12rem] py-1 pr-2">
                    <CustomerPicker
                      id={line.id}
                      value={line.customer}
                      customers={customers}
                      onChange={(name) => setCustomer(line.id, name)}
                      onRemember={remember}
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
                      {line.code &&
                      !codes.some((item) => item.code === line.code) ? (
                        <option value={line.code}>{line.code}</option>
                      ) : null}
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
              <div className="grid grid-cols-1 gap-2">
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
                    {line.code &&
                    !codes.some((item) => item.code === line.code) ? (
                      <option value={line.code}>{line.code}</option>
                    ) : null}
                    {codes.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} · {formatMoney(item.rate)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid min-w-0 gap-1.5">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <CustomerPicker
                    id={`${line.id}-mobile`}
                    value={line.customer}
                    customers={customers}
                    onChange={(name) => setCustomer(line.id, name)}
                    onRemember={remember}
                  />
                </div>
                <Field label="Lot / community or address">
                  <Input
                    value={line.address}
                    onChange={(event) =>
                      updateLine(line.id, { address: event.target.value })
                    }
                  />
                </Field>
                <div className="grid min-w-0 grid-cols-2 gap-2">
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
                </div>
                <Field label="PC pay total">
                  <p className="flex h-11 items-center text-sm tabular-nums md:h-8">
                    {formatMoney(lineAmount(line))}
                  </p>
                </Field>
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
          ))}
        </div>
      </section>

      <CollapsedEditor
        title="Builders"
        summary={`${customers.length} names · open to add or edit the Customer list`}
      >
        <div className="max-h-64 overflow-auto rounded-lg ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {customers.map((item, index) => (
                <tr key={item.id} className="border-t">
                  <td className="px-2 py-1">
                    <Input
                      id={`builder-name-${item.id}`}
                      value={item.name}
                      onChange={(event) =>
                        updateCustomer(index, { name: event.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Remove ${item.name || "builder"}`}
                      onClick={() =>
                        onCustomersChange(
                          customers.filter((_, i) => i !== index),
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-md:h-11"
            onClick={() => {
              const created = emptyCustomer();
              focusCustomerId.current = created.id;
              onCustomersChange([...customers, created]);
            }}
          >
            <Plus />
            Add builder
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCustomersChange(STARTER_CUSTOMERS)}
          >
            Restore company list
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          <Field label="Paste builders (one per line)">
            <Textarea
              rows={4}
              value={importCustomers}
              onChange={(event) => setImportCustomers(event.target.value)}
              placeholder={"Pulte Homes\nLennar Atlanta\nOther / Custom Builder"}
            />
          </Field>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const parsed = parseCustomerList(importCustomers);
              if (parsed.length) {
                onCustomersChange(parsed);
                setImportCustomers("");
              }
            }}
          >
            Replace list from paste
          </Button>
        </div>
      </CollapsedEditor>

      <CollapsedEditor
        title="Job codes"
        summary={`${codes.length} codes · open to edit rates or paste a new list`}
      >
        <div className="max-h-64 overflow-auto rounded-lg ring-1 ring-foreground/10">
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
                <tr key={item.id} className="border-t">
                  <td className="px-2 py-1">
                    <Input
                      id={`job-code-${item.id}`}
                      value={item.code}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-md:h-11"
            onClick={() => {
              const created = emptyCode();
              focusCodeId.current = created.id;
              onCodesChange([...codes, created]);
            }}
          >
            <Plus />
            Add code
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCodesChange(STARTER_CODES)}
          >
            Restore company list
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
      </CollapsedEditor>
    </div>
  );
}

function CollapsedEditor({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
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
    <label className="grid min-w-0 gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </label>
  );
}

function CustomerPicker({
  id,
  value,
  customers,
  onChange,
  onRemember,
}: {
  id: string;
  value: string;
  customers: Customer[];
  onChange: (name: string) => void;
  onRemember: (name: string) => void;
}) {
  const inList = Boolean(findCustomer(customers, value));
  const [typing, setTyping] = useState(Boolean(value) && !inList);

  useEffect(() => {
    if (inList) setTyping(false);
  }, [inList]);

  return (
    <div className="grid min-w-0 gap-1">
      <select
        className={selectClassName}
        value={typing ? "__custom__" : value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "__custom__") {
            setTyping(true);
            if (inList) onChange("");
            window.setTimeout(() => {
              document.getElementById(`customer-custom-${id}`)?.focus();
            }, 0);
            return;
          }
          setTyping(false);
          onChange(next);
        }}
      >
        <option value="">Customer</option>
        {customers.map((item) =>
          item.name ? (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ) : null,
        )}
        <option value="__custom__">Type a name…</option>
      </select>
      {typing ? (
        <Input
          id={`customer-custom-${id}`}
          value={value}
          placeholder="Builder name"
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onRemember(value)}
        />
      ) : null}
    </div>
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
