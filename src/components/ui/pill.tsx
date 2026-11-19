import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Status tones from the mockup (`.pa .ppn .pr .pd .pb .pn`). */
export type Tone = 'approved' | 'pending' | 'returned' | 'draft' | 'info' | 'neutral';

const PILL: Record<Tone, string> = {
  approved: 'bg-approved-bg text-approved-fg',
  pending: 'bg-pending-bg text-pending-fg',
  returned: 'bg-returned-bg text-returned-fg',
  draft: 'bg-draft-bg text-draft-fg',
  info: 'bg-info-bg text-info-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
};

/** Row tint for a status (`tr.ra / rp / rr / rd`). */
export const ROW_TINT: Record<Tone, string> = {
  approved: 'bg-approved-row',
  pending: 'bg-pending-row',
  returned: 'bg-returned-row',
  draft: 'bg-draft-row',
  info: '',
  neutral: '',
};

/** Status pill: a dot AND the word, never colour alone (WCAG 1.4.1). */
export function Pill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px] rounded-[20px] px-[11px] py-1 text-[12.5px] font-semibold whitespace-nowrap',
        PILL[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-[7px] rounded-full bg-current opacity-85" />
      {children}
    </span>
  );
}

/** Active / Inactive login, Working / Resigned. */
export function LoginPill({ status }: { status: string }) {
  return status === 'ACTIVE' ? (
    <Pill tone="approved">Active</Pill>
  ) : (
    <Pill tone="returned">Inactive</Pill>
  );
}

export function WorkingPill({ status }: { status: string }) {
  return status === 'WORKING' ? (
    <Pill tone="approved">Working</Pill>
  ) : (
    <Pill tone="neutral">Resigned</Pill>
  );
}
