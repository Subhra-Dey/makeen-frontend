import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

/** Base look of every text box / select (mockup `.in`): 44 px, 10 px radius, teal focus ring. */
export const inputClass = cn(
  'h-input w-full min-w-0 rounded-input border border-input-border bg-surface px-3 text-[14px] text-navy',
  'placeholder:text-placeholder focus:border-teal focus:outline-2 focus:outline-[#A8DCDD]',
  'disabled:cursor-not-allowed disabled:bg-bg',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#FFF8F7]',
);

interface FieldProps {
  label: ReactNode;
  /** Field number from the spec (shown muted before the label). */
  n?: number;
  required?: boolean;
  hint?: ReactNode;
  error?: string | undefined;
  /** Shows the AUTO badge (system-computed, read-only). */
  auto?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/**
 * Label + control + hint + error, wired for screen readers (WCAG 2.2: label, aria-describedby,
 * aria-invalid). The error text sits under the field (spec “UX validations”).
 */
export function Field({ label, n, required, hint, error, auto, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 text-[12.5px] font-semibold text-[#2A3E52]',
        className,
      )}
    >
      <label htmlFor={id} id={`${id}-label`} className="flex items-center gap-1.5">
        {/* #5B6576 keeps AA contrast on tinted rows and cards too. */}
        {n !== undefined && <span className="min-w-5 font-medium text-[#5B6576] num">{n}</span>}
        <span>
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </span>
        {auto && <AutoBadge />}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <span id={errId} className="text-[12px] font-medium text-danger-text" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="text-[12px] font-normal text-[#5B6576]">
          {hint}
        </span>
      )}
    </div>
  );
}

export function AutoBadge() {
  return (
    <span className="rounded-[5px] bg-[#E2EEF2] px-1.5 py-px text-[10.5px] font-semibold tracking-[0.04em] text-[#2C5068] uppercase">
      Auto
    </span>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
  },
);

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(inputClass, 'appearance-auto pr-2', className)} {...rest}>
        {children}
      </select>
    );
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(inputClass, 'h-20 resize-y py-2.5', className)} {...rest} />
  );
});

/** Read-only, system-filled value: dashed border + AUTO badge on the label (design rules). */
export function ReadOnlyValue({
  id,
  value,
  className,
}: {
  id?: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      role="textbox"
      aria-readonly="true"
      // A <label for> cannot name a div; point at the Field's label instead.
      aria-labelledby={id ? `${id}-label` : undefined}
      className={cn(
        inputClass,
        'flex items-center border-dashed bg-bg text-[#334155] num',
        className,
      )}
    >
      {value}
    </div>
  );
}

/** System sum in a teal Σ box (design rules). */
export function SumBox({ label, value }: { label?: string; value: ReactNode }) {
  return (
    <div className="flex h-input items-center justify-between rounded-[9px] border border-[#BFE3E3] bg-[#EAF6F6] px-3 font-bold text-[#0C6E72] num">
      <span aria-hidden="true">Σ</span>
      {label && <span className="sr-only">{label}</span>}
      <span>{value}</span>
    </div>
  );
}
