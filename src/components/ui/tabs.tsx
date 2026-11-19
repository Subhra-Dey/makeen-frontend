'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabLink {
  href: string;
  label: string;
  badge?: ReactNode;
}

/** Page tabs as links (mockup `.tabs`): teal underline on the current page. */
export function LinkTabs({ tabs, label }: { tabs: readonly TabLink[]; label: string }) {
  const path = usePathname();
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const on = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={cn(
              '-mb-px flex min-h-touch items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-semibold hover:no-underline',
              on
                ? 'border-teal text-teal-ink'
                : 'border-transparent text-[#475569] hover:text-navy',
            )}
          >
            {t.label}
            {t.badge}
          </Link>
        );
      })}
    </nav>
  );
}
