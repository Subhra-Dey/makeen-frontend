import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/shared';

export type KpiTone = 'teal' | 'amber' | 'red' | 'slate';

const TONE: Record<KpiTone, { icon: string; bar: string }> = {
  teal: { icon: 'bg-kpi-teal-bg text-kpi-teal-fg', bar: 'after:bg-kpi-teal-bar' },
  amber: { icon: 'bg-kpi-amber-bg text-kpi-amber-fg', bar: 'after:bg-kpi-amber-bar' },
  red: { icon: 'bg-kpi-red-bg text-kpi-red-fg', bar: 'after:bg-kpi-red-bar' },
  slate: { icon: 'bg-kpi-slate-bg text-kpi-slate-fg', bar: 'after:bg-kpi-slate-bar' },
};

interface KpiCardProps {
  label: string;
  value: number | null;
  sub?: ReactNode;
  tone: KpiTone;
  icon: ReactNode;
  /** Card filters the table when clicked (spec “Card strip”); `selected` marks the active one. */
  onSelect?: () => void;
  selected?: boolean;
}

/** Count card (mockup `.card`): 62 px icon circle, label, big number, coloured bottom bar. */
export function KpiCard({ label, value, sub, tone, icon, onSelect, selected }: KpiCardProps) {
  const t = TONE[tone];
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'flex size-kpi-icon flex-none items-center justify-center rounded-full',
          t.icon,
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-medium text-navy">{label}</span>
        <span className="font-heading text-[32px] leading-tight font-bold tracking-[-0.02em] text-navy num">
          {value === null ? '—' : formatNumber(value, 0)}
        </span>
        {sub && <span className="text-[12px] text-muted">{sub}</span>}
      </span>
    </>
  );
  const cls = cn(
    'relative flex items-center gap-4 overflow-hidden rounded-card border border-line bg-surface px-5 py-[18px] text-left shadow-card',
    'after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:content-[""]',
    t.bar,
    onSelect &&
      'cursor-pointer hover:border-[#A9D8D9] hover:shadow-[0_8px_22px_rgba(27,154,160,0.12)]',
    selected && 'border-teal shadow-[inset_0_0_0_1px_var(--color-teal)]',
  );
  return onSelect ? (
    <button type="button" className={cls} onClick={onSelect} aria-pressed={selected ?? false}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[18px]">{children}</div>
  );
}
