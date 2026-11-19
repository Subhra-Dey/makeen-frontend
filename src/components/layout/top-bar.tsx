'use client';

import { ChevronsLeft, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { NotificationBell } from './notification-bell';
import type { MeResponse } from '@/shared';
import { roleSummary } from '@/lib/people';

/** Initials for the avatar (photographs come from KEKA when available). */
export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Header (spec “Header”): menu button on small screens; bell with the unread count, the signed-in
 * name (opens Profile) and Logout on the right. 76 px, 64 px below 900 px.
 */
export function TopBar({
  me,
  onOpenMenu,
  onLogout,
}: {
  me: MeResponse;
  onOpenMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-15 flex h-topbar-mobile items-center gap-2 border-b border-line bg-white/88 px-3 backdrop-blur-[6px] nav:h-topbar nav:gap-[18px] nav:px-7">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="flex size-touch rotate-180 cursor-pointer items-center justify-center rounded-[10px] text-navy hover:bg-[#F1F4F8] nav:hidden"
      >
        <ChevronsLeft aria-hidden="true" className="size-5" />
      </button>
      {/* HDR-1: the sidebar carries the logo on wide screens; the header carries it when the
          menu is a drawer. */}
      <Link href="/dashboard" className="flex items-center hover:no-underline nav:hidden">
        <span className="min-[480px]:hidden">
          <Logo variant="mark" />
        </span>
        <span className="hidden min-[480px]:block">
          <Logo />
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2 nav:gap-3.5">
        <span aria-hidden="true" className="hidden h-[34px] w-px bg-line nav:block" />
        <NotificationBell />
        <span className="flex min-h-touch items-center gap-3 rounded-[12px] py-1.5 pr-2.5 pl-1.5 text-navy">
          <span className="flex size-[42px] flex-none items-center justify-center rounded-full bg-navy text-[14px] font-bold text-white">
            {initials(me.user.name)}
          </span>
          <span className="hidden nav:block">
            <b className="block text-[14.5px] text-navy">{me.user.name}</b>
            <small className="block text-[12px] text-muted">{roleSummary(me)}</small>
          </span>
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-touch cursor-pointer items-center gap-1.5 rounded-[10px] px-3 font-medium text-[#334155] hover:bg-[#F1F4F8] hover:text-navy"
        >
          <LogOut aria-hidden="true" className="size-5" strokeWidth={1.8} />
          <span className="hidden nav:inline">Logout</span>
          <span className="sr-only nav:hidden">Logout</span>
        </button>
      </div>
    </header>
  );
}
