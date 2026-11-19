import type { ReactNode } from 'react';
import { ModuleGuard } from '@/components/layout/module-guard';

export default function DailyMisLayout({ children }: { children: ReactNode }) {
  return <ModuleGuard module="DAILY_MIS">{children}</ModuleGuard>;
}
