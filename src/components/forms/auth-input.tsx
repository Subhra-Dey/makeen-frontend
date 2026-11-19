'use client';

import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: ReactNode;
  error?: string | undefined;
  /** Adds the show / hide toggle for password boxes. */
  reveal?: boolean;
};

/**
 * Large sign-in field (mockup `.iin`): 56 px, icon on the left, teal focus ring; error under it.
 * The visible label is the placeholder in the mockup, so the label is kept for screen readers.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { label, icon, error, reveal = false, type, className, ...rest },
  ref,
) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          'flex h-auth-input items-center gap-3.5 rounded-auth-input border border-input-border bg-surface px-[18px] text-[#5B6B7C]',
          'focus-within:border-teal focus-within:shadow-[0_0_0_3px_#DDF1F1]',
          error && 'border-danger',
          className,
        )}
      >
        <span aria-hidden="true" className="flex-none">
          {icon}
        </span>
        <input
          ref={ref}
          id={id}
          type={reveal && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-navy outline-none placeholder:text-placeholder"
          {...rest}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => {
              setShown((s) => !s);
            }}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="-mr-2 flex size-touch flex-none cursor-pointer items-center justify-center rounded-[10px] text-muted hover:bg-[#F1F4F8]"
          >
            {shown ? (
              <EyeOff aria-hidden="true" className="size-5" />
            ) : (
              <Eye aria-hidden="true" className="size-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <span id={errId} role="alert" className="text-[12px] font-medium text-danger-text">
          {error}
        </span>
      )}
    </div>
  );
});
