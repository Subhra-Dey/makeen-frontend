'use client';

import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { inputClass } from './field';

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id?: string;
  options: readonly Option[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  /** Adds an “All …” toggle at the top of the list. */
  allLabel?: string;
  invalid?: boolean;
  describedBy?: string | undefined;
  disabled?: boolean;
}

/**
 * Multi-select with chips (mockup Plant / Portal role(s) fields): a button that opens a searchable
 * checkbox list. Chips can be removed one by one.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  allLabel,
  invalid,
  describedBy,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const listId = useId();
  const selected = useMemo(() => new Set(value), [value]);
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const allOn = options.length > 0 && options.every((o) => selected.has(o.value));
  const labelOf = new Map(options.map((o) => [o.value, o.label]));

  function toggle(v: string): void {
    onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          inputClass,
          'flex h-auto min-h-input flex-wrap items-center gap-1.5 py-1.5 pr-1',
          invalid && 'border-danger bg-[#FFF8F7]',
          disabled && 'bg-bg',
        )}
      >
        {value.length === 0 && (
          // Real text (not a placeholder attribute), so it must meet AA even on a disabled field.
          <span className={disabled ? 'text-[#5B6576]' : 'text-placeholder'}>{placeholder}</span>
        )}
        {allOn && allLabel ? (
          <Chip
            label={`${allLabel} (${options.length})`}
            onRemove={
              disabled
                ? undefined
                : () => {
                    onChange([]);
                  }
            }
          />
        ) : (
          value.map((v) => (
            <Chip
              key={v}
              label={labelOf.get(v) ?? v}
              onRemove={
                disabled
                  ? undefined
                  : () => {
                      toggle(v);
                    }
              }
            />
          ))
        )}
        <Popover.Trigger
          id={id}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-[8px] text-muted hover:bg-[#F1F4F8] pointer-coarse:size-touch"
        >
          <span className="sr-only">{placeholder}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[min(360px,calc(100vw-32px))] rounded-[12px] border border-line bg-surface p-2 shadow-[0_16px_40px_rgba(11,39,66,0.18)]"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Search"
            aria-label="Search options"
            className={cn(inputClass, 'mb-2 h-10')}
          />
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            className="m-0 max-h-72 list-none overflow-y-auto p-0"
          >
            {allLabel && (
              <Item
                on={allOn}
                label={allLabel}
                onSelect={() => {
                  onChange(allOn ? [] : options.map((o) => o.value));
                }}
              />
            )}
            {shown.map((o) => (
              <Item
                key={o.value}
                on={selected.has(o.value)}
                label={o.label}
                onSelect={() => {
                  toggle(o.value);
                }}
              />
            ))}
            {shown.length === 0 && <li className="px-3 py-2 text-muted">No matches</li>}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Item({ on, label, onSelect }: { on: boolean; label: string; onSelect: () => void }) {
  return (
    <li role="option" aria-selected={on}>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 text-left text-[14px] text-navy hover:bg-[#F4F8FB] pointer-coarse:min-h-touch"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-[18px] flex-none items-center justify-center rounded-[5px] border',
            on ? 'border-teal-ink bg-teal-ink text-white' : 'border-input-border bg-surface',
          )}
        >
          {on && <Check className="size-3.5" />}
        </span>
        {label}
      </button>
    </li>
  );
}

export function Chip({ label, onRemove }: { label: string; onRemove?: (() => void) | undefined }) {
  return (
    <span className="inline-flex h-[26px] items-center gap-1 rounded-2xl border border-[#CBD5E1] bg-surface pr-1 pl-3 text-[12.5px] font-semibold text-[#334155]">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-[#F1F4F8]"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      )}
    </span>
  );
}
