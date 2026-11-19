'use client';

import { ChevronRight, ChevronsLeft, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';
import { activeKey, type NavItem } from '@/lib/nav';
import { NavIcon } from './nav-icon';

interface SidebarProps {
  items: readonly NavItem[];
  rail: boolean;
  /** Desktop collapse button (hidden in the mobile drawer). */
  onToggleRail?: () => void;
  onNavigate?: () => void;
  onLogout: () => void;
  isAdmin: boolean;
}

const itemBase =
  'flex min-h-[46px] items-center gap-3.5 rounded-[10px] px-3.5 py-[11px] text-[14.5px] text-sidebar-text hover:bg-white/7 hover:text-white hover:no-underline';

/** Navy gradient side menu (mockup `.side`): 264 px, or an 84 px icon rail. */
export function Sidebar({
  items,
  rail,
  onToggleRail,
  onNavigate,
  onLogout,
  isAdmin,
}: SidebarProps) {
  const path = usePathname();
  const active = activeKey(items, path);
  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-y-auto bg-linear-to-b from-sidebar-from to-sidebar-to py-[18px]',
        rail ? 'px-3' : 'px-3.5',
      )}
    >
      <div className={cn('pt-1.5 pb-4', rail ? 'px-1 text-center' : 'px-2.5')}>
        <Link href="/dashboard" onClick={onNavigate} className="inline-block hover:no-underline">
          <Logo variant={rail ? 'mark' : 'full'} tone="dark" />
        </Link>
      </div>
      {onToggleRail && (
        <button
          type="button"
          onClick={onToggleRail}
          aria-label={rail ? 'Expand menu' : 'Collapse menu'}
          aria-expanded={!rail}
          className={cn(
            'mb-2 flex h-9 w-10 cursor-pointer items-center justify-center rounded-[8px] text-[#9DB4C8] hover:bg-white/8 hover:text-white',
            rail ? 'mx-auto rotate-180' : 'ml-2',
          )}
        >
          <ChevronsLeft aria-hidden="true" className="size-5" />
        </button>
      )}
      <nav aria-label="Main menu" className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const on = item.key === active;
          const content = (
            <>
              <NavIcon name={item.icon} />
              {!rail && <span className="flex-1">{item.label}</span>}
              {!rail && item.subs.length > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className={cn('size-4 opacity-60 transition-transform', on && 'rotate-90')}
                />
              )}
            </>
          );
          return (
            <div key={item.key}>
              {item.adminPanel && !rail && (
                <div className="px-3.5 pt-3.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-sidebar-muted uppercase">
                  Admin panel
                </div>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={rail ? item.label : undefined}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    itemBase,
                    rail && 'justify-center px-0',
                    on && 'bg-teal-ink text-white shadow-nav-active hover:bg-teal-ink',
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title={`${item.label} — not available yet`}
                  className={cn(
                    itemBase,
                    'cursor-default opacity-50 hover:bg-transparent',
                    rail && 'justify-center px-0',
                  )}
                >
                  {content}
                </span>
              )}
              {on && !rail && item.subs.length > 0 && (
                <div className="mt-0.5 mb-1.5 flex flex-col gap-0.5">
                  {item.subs.map((s) => {
                    const subOn = s.href === path;
                    const cls = cn(
                      'relative flex min-h-9 items-center rounded-[10px] py-2 pr-3.5 pl-[50px] text-[13.5px] text-[#BCCCDA] hover:no-underline',
                      'before:absolute before:top-1/2 before:left-[30px] before:size-[5px] before:-translate-y-1/2 before:rounded-full before:content-[""]',
                      subOn
                        ? 'bg-white/10 text-white before:bg-teal-accent'
                        : 'before:bg-sidebar-muted',
                      s.href && 'hover:bg-white/7 hover:text-white',
                      !s.href && 'cursor-default opacity-50',
                    );
                    return s.href ? (
                      <Link
                        key={s.label}
                        href={s.href}
                        onClick={onNavigate}
                        aria-current={subOn ? 'page' : undefined}
                        className={cls}
                      >
                        {s.label}
                      </Link>
                    ) : (
                      <span key={s.label} aria-disabled="true" className={cls}>
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-3.5 flex flex-col gap-0.5 border-t border-white/12 pt-3">
        <button
          type="button"
          onClick={onLogout}
          title={rail ? 'Logout' : undefined}
          className={cn(
            itemBase,
            'min-h-touch cursor-pointer py-2.5 text-left',
            rail && 'justify-center px-0',
          )}
        >
          <LogOut aria-hidden="true" className="size-[22px] flex-none" strokeWidth={1.8} />
          {!rail && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
