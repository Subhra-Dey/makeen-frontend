import type { ReactNode } from 'react';

/** Page title block (mockup `.ph`): crumb, 38 px title (28 on phones), subtitle, actions. */
export function PageHeader({
  crumb,
  title,
  sub,
  actions,
}: {
  crumb?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumb && <div className="mb-1 text-[12.5px] text-muted">{crumb}</div>}
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-navy nav:text-[38px]">
          {title}
        </h1>
        {sub && <p className="m-0 mt-1.5 text-[15.5px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

/** Content column (mockup `.wrap`). */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-content flex-col gap-[22px]">{children}</div>;
}
