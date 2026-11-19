import type { Metadata } from 'next';
import { ApprovalQueue } from './approval-queue';

export const metadata: Metadata = { title: 'Approval queue' };

export default function ApprovalsPage() {
  return <ApprovalQueue />;
}
