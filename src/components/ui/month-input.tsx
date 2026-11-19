'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { istCurrentMonth } from '@/shared';
import { SelectInput } from './field';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** First year offered (the oldest plant contract in the portal starts in 2020). */
const FIRST_YEAR = 2020;

const split = (v: string): [string, string] =>
  /^\d{4}-\d{2}$/.test(v) ? (v.split('-') as [string, string]) : ['', ''];

/**
 * Month and year picker (spec “Month yyyy”): two selects, so a month can never be mistyped.
 * Reports `yyyy-MM` once both parts are chosen, '' otherwise. Months after the current India
 * month cannot be chosen (MMIS-H2); the API checks the same rule.
 */
export function MonthInput({
  id,
  value,
  onChange,
  disabled,
  className,
  describedBy,
  invalid,
}: {
  id?: string;
  /** `yyyy-MM` or ''. */
  value: string;
  onChange: (month: string) => void;
  disabled?: boolean;
  className?: string;
  describedBy?: string | undefined;
  invalid?: boolean;
}) {
  const current = istCurrentMonth();
  const thisYear = Number(current.slice(0, 4));
  const [parts, setParts] = useState(() => split(value));
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setParts(split(value));
  }
  const [y, m] = parts;
  const years: string[] = [];
  for (let n = thisYear; n >= FIRST_YEAR; n -= 1) years.push(String(n));

  function choose(year: string, month: string): void {
    const future = year !== '' && month !== '' && `${year}-${month}` > current;
    const next: [string, string] = [year, future ? '' : month];
    setParts(next);
    const v = next[0] && next[1] ? `${next[0]}-${next[1]}` : '';
    setLast(v);
    onChange(v);
  }

  return (
    <div className={cn('flex min-w-0 gap-1.5', className)}>
      <SelectInput
        id={id}
        aria-label="Month"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={m}
        className="min-w-0 flex-[1_1_60%]"
        onChange={(e) => {
          choose(y, e.target.value);
        }}
      >
        <option value="">Month</option>
        {MONTH_NAMES.map((name, i) => {
          const mm = String(i + 1).padStart(2, '0');
          return (
            <option key={mm} value={mm} disabled={y !== '' && `${y}-${mm}` > current}>
              {name}
            </option>
          );
        })}
      </SelectInput>
      <SelectInput
        aria-label="Year"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={y}
        className="min-w-0 flex-[1_1_40%]"
        onChange={(e) => {
          choose(e.target.value, m);
        }}
      >
        <option value="">Year</option>
        {years.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </SelectInput>
    </div>
  );
}
