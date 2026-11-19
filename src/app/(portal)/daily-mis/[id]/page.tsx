import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DailyMisFormPage } from '../daily-mis-form';

export const metadata: Metadata = { title: 'Daily MIS' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One Daily MIS (Action on a table row): edit, review, approve / return, or read only. */
export default async function DailyMisRowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <DailyMisFormPage id={id} />;
}
