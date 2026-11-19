import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Buttons from the mockup: default (white), primary (teal), dark (navy), outline (teal border),
 * danger (Return). Heights 42 / 34 (sm) / 56 (big, auth screens); 44 px touch target on touch
 * screens via min-height.
 */
export type ButtonVariant = 'default' | 'primary' | 'dark' | 'outline' | 'danger';
export type ButtonSize = 'md' | 'sm' | 'big';

const VARIANT: Record<ButtonVariant, string> = {
  default: 'border-[#CFDAE3] bg-surface text-navy hover:bg-[#F4F7FA]',
  primary:
    'border-teal-ink bg-teal-ink text-white hover:bg-teal-ink-hover hover:border-teal-ink-hover',
  dark: 'border-navy bg-navy text-white hover:bg-navy-hover hover:border-navy-hover',
  outline: 'border-teal bg-surface text-teal-ink hover:bg-[#ECF8F8]',
  danger: 'border-[#F2B8B3] bg-surface text-danger-text hover:bg-returned-row',
};

const SIZE: Record<ButtonSize, string> = {
  md: 'h-[42px] px-4 text-[14px] rounded-button',
  sm: 'h-[34px] px-2.5 text-[13px] rounded-[8px] pointer-coarse:min-h-touch',
  big: 'h-14 justify-center rounded-auth-input px-4 text-[17px]',
};

export function buttonClass(variant: ButtonVariant = 'default', size: ButtonSize = 'md'): string {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center gap-2 border font-semibold whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55',
    VARIANT[variant],
    SIZE[size],
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  busy?: boolean;
};

export function Button({
  variant,
  size,
  icon,
  busy = false,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClass(variant, size), className)}
      disabled={disabled === true || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClass(variant, size), 'hover:no-underline', className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}
