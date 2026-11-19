'use client';

import { useId, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Background when selected (default navy). */
  selectedClass?: string;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Segmented single choice (mockup `.seg`), as an ARIA radio group: arrow keys move the choice,
 * one tab stop for the group.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: SegmentedProps<T>) {
  const name = useId();
  const index = options.findIndex((o) => o.value === value);
  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number): void {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = options[(i + step + options.length) % options.length];
    if (next) {
      onChange(next.value);
      const group = e.currentTarget.parentElement;
      const target = group?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
      target?.focus();
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={cn(
        'inline-flex flex-none overflow-hidden rounded-[9px] border border-[#CBD5E1]',
        className,
      )}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            name={name}
            data-value={o.value}
            aria-checked={on}
            tabIndex={on || (index < 0 && i === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => {
              onChange(o.value);
            }}
            onKeyDown={(e) => {
              onKey(e, i);
            }}
            className={cn(
              'h-9 min-w-16 cursor-pointer px-3.5 text-[13px] font-semibold text-[#334155] pointer-coarse:min-h-touch',
              i > 0 && 'border-l border-[#CBD5E1]',
              on ? (o.selectedClass ?? 'bg-[#0B2742] text-white') : 'bg-surface hover:bg-[#F4F7FA]',
              disabled && 'cursor-not-allowed',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const YES_NO = [
  { value: 'YES', label: 'Yes', selectedClass: 'bg-warning text-navy' },
  { value: 'NO', label: 'No' },
] as const satisfies readonly SegmentOption<'YES' | 'NO'>[];

/** Yes / No segmented control — Yes is amber (design rules). */
export function YesNo({
  value,
  onChange,
  label,
  disabled,
}: {
  value: 'YES' | 'NO' | null;
  onChange: (v: 'YES' | 'NO') => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Segmented
      options={YES_NO}
      value={value}
      onChange={onChange}
      label={label}
      disabled={disabled}
    />
  );
}
