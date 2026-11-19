import type { Metadata } from 'next';
import { DailyMisTable } from './daily-mis-table';

export const metadata: Metadata = { title: 'Daily MIS' };

export default function DailyMisPage() {
  return <DailyMisTable />;
}
