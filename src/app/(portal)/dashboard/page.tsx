import type { Metadata } from 'next';
import { DashboardView } from './dashboard-view';

export const metadata: Metadata = { title: 'Dashboard' };

/** Dashboard tab of Dashboard & Profile (spec “Dashboard”, NAV-2). */
export default function DashboardPage() {
  return <DashboardView />;
}
