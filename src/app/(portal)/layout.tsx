import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RAIL_COOKIE } from '@/lib/ui-prefs';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const rail = (await cookies()).get(RAIL_COOKIE)?.value === '1';
  return <AppShell initialRail={rail}>{children}</AppShell>;
}
