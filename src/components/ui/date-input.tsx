'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { formatDate, isIsoDate, parseDisplayDate } from '@/shared';
import { inputClass } from './field';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  /** ISO `yyyy-MM-dd`, or '' when empty. */
  value: string;
  /** Called with ISO `yyyy-MM-dd`, '' when cleared, or null while the text is not a real date. */
  onChange: (iso: string | null) => void;
};

/**
 * Date box in the spec's `dd-mm-yyyy` form (placeholder “dd-mm-yyyy”). Shows what was typed and
 * reports an ISO date only once the text is a real date; the caller checks “not in the future”.
 */
export function DateInput({ value, onChange, className, ...rest }: DateInputProps) {
  const [text, setText] = useState(isIsoDate(value) ? formatDate(value) : '');
  const [last, setLast] = useState(value);
  if (value !== last) {
    // Value changed from outside (e.g. Reset): show it.
    setLast(value);
    setText(isIsoDate(value) ? formatDate(value) : '');
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd-mm-yyyy"
      maxLength={10}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d-]/g, '');
        setText(t);
        if (t.trim() === '') {
          setLast('');
          onChange('');
          return;
        }
        const iso = parseDisplayDate(t);
        if (iso !== null) setLast(iso);
        onChange(iso);
      }}
      className={cn(inputClass, 'num', className)}
      {...rest}
    />
  );
}
