import {
  Bell,
  CalendarDays,
  ChartColumn,
  Factory,
  FileText,
  House,
  ShieldCheck,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NavIcon as NavIconName } from '@/lib/nav';

const ICONS: Record<NavIconName, LucideIcon> = {
  home: House,
  daily: FileText,
  monthly: CalendarDays,
  exceptions: TriangleAlert,
  review: ShieldCheck,
  plant: Factory,
  graphs: ChartColumn,
  people: Users,
  notification: Bell,
};

export function NavIcon({ name }: { name: NavIconName }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className="size-[22px] flex-none" strokeWidth={1.8} />;
}
