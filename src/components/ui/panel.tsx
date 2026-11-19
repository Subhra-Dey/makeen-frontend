import type { HTMLAttributes, ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

/** White card with the mockup border, radius 14 and soft shadow. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-clip rounded-card border border-line bg-surface shadow-card',
        className,
      )}
      {...rest}
    />
  );
}

/** Panel header row (`.tblh`): title + optional sub line, actions on the right. */
export function PanelHeader({
  title,
  sub,
  actions,
  as: Heading = 'h2',
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF2F6] px-5 py-4">
      <div className="min-w-0">
        <Heading className="text-[17px] font-bold text-navy">{title}</Heading>
        {sub && <p className="m-0 text-[12.5px] text-[#5B6576]">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type BoxTone = 'info' | 'warn' | 'success' | 'error';

const BOX: Record<BoxTone, string> = {
  info: 'border-[#C5E6E6] bg-[#EEF8F8] text-[#0C5E62]',
  warn: 'border-[#FEDF89] bg-[#FFFAEB] text-[#7A4100]',
  success: 'border-[#B7E3D9] bg-[#E9F7F4] font-semibold text-[#0B6A5F]',
  error: 'border-[#F5C2BE] bg-[#FDECEC] font-medium text-danger-text',
};

const BOX_ICON: Record<BoxTone, ReactNode> = {
  info: <Info aria-hidden="true" className="mt-px size-[18px] flex-none" />,
  warn: <TriangleAlert aria-hidden="true" className="mt-px size-[18px] flex-none" />,
  success: <CircleCheck aria-hidden="true" className="mt-px size-[18px] flex-none" />,
  error: <TriangleAlert aria-hidden="true" className="mt-px size-[18px] flex-none" />,
};

/** Info / warning / success / error message box (`.infobox .warnbox .toast .err`). */
export function MessageBox({
  tone,
  children,
  className,
  role,
}: {
  tone: BoxTone;
  children: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[13px]',
        BOX[tone],
        className,
      )}
    >
      {BOX_ICON[tone]}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** “No rows” empty state (design rules) — headers stay visible above it. */
export function EmptyState({ children = 'No rows' }: { children?: ReactNode }) {
  return <p className="m-0 px-5 py-10 text-center text-[14px] text-muted">{children}</p>;
}
