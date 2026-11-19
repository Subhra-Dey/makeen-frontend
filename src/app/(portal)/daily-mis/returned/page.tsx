import type { Metadata } from 'next';
import { DailyMisTable } from '../daily-mis-table';

export const metadata: Metadata = { title: 'Returned MIS' };

/** Returned rows only; each opens the Returned view of the form (DMIS-R7). */
export default function ReturnedMisPage() {
  return <DailyMisTable returnedOnly />;
}
