import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageBody } from '@/components/layout/page-header';
import { HomeHeader } from '../home-header';
import { Inbox } from './inbox';

export const metadata: Metadata = { title: 'Notifications' };

/** Notifications tab of Dashboard & Profile — the inbox (NOTIF-1, NOTIF-6). */
export default function NotificationsPage() {
  return (
    <PageBody>
      <HomeHeader tab="notifications" />
      <Suspense>
        <Inbox />
      </Suspense>
    </PageBody>
  );
}
