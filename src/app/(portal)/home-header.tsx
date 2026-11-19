'use client';

import { PageHeader } from '@/components/layout/page-header';
import { LinkTabs } from '@/components/ui/tabs';
import { useMe } from '@/lib/session';

const TABS = [{ href: '/dashboard', label: 'Dashboard' }] as const;

/** Greeting by India time (spec: IST for every “today”). */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** “Friday, 16 October 2026” in IST. */
export function longIstDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(now);
}

/** Header + tabs of the “Dashboard & Profile” page (spec Left menu 1). */
export function HomeHeader({ tab }: { tab: 'dashboard' | 'notifications' | 'profile' }) {
  const me = useMe().data;
  const first = me?.user.name.split(' ')[0] ?? '';
  const plants = me
    ? me.isAdmin
      ? 'All plants'
      : `${me.plants.length} plant${me.plants.length === 1 ? '' : 's'}`
    : '';
  const head =
    tab === 'dashboard'
      ? { title: `${greeting()}, ${first}`, sub: `${longIstDate()} · ${plants}` }
      : tab === 'notifications'
        ? {
            title: 'Notifications',
            sub: 'One inbox for the whole portal — opening a notice opens the exact row and marks it Read.',
          }
        : { title: 'Profile', sub: 'Your details from KEKA · read only' };
  return (
    <>
      <PageHeader crumb="Dashboard" title={head.title} sub={head.sub} />
      <LinkTabs tabs={TABS} label="Dashboard" />
    </>
  );
}
