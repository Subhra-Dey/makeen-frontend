import type { Metadata } from 'next';
import { DailyMisFormPage } from '../daily-mis-form';

export const metadata: Metadata = { title: 'Daily MIS — new report' };

/** Submit → a blank Daily MIS form (spec “Daily MIS — form”). */
export default function NewDailyMisPage() {
  return <DailyMisFormPage id={null} />;
}
