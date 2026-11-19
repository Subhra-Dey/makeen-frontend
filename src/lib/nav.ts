import type { Capability, MeResponse, Module } from '@/shared';

/**
 * Left menu (spec “Left menu”; mockup sidebar). An item shows only when the person's roles do not
 * Hide its module (ROLE-9). Screens of modules built in later phases are listed but not yet
 * linked (`href: null`) so the menu already reflects each role (D-79).
 */
export type NavIcon =
  | 'home'
  | 'daily'
  | 'monthly'
  | 'exceptions'
  | 'review'
  | 'plant'
  | 'graphs'
  | 'people'
  | 'notification';

export interface NavLink {
  label: string;
  href: string | null;
}

export interface NavItem {
  key: string;
  label: string;
  icon: NavIcon;
  /** First section of the Admin panel starts here (group label above it). */
  adminPanel?: boolean;
  href: string | null;
  subs: NavLink[];
}

interface Def {
  key: string;
  label: string;
  icon: NavIcon;
  adminPanel?: boolean;
  /** Visible when any of these modules is not Hidden; `null` = always (inbox, profile). */
  modules: readonly Module[] | null;
  href: string | null;
  /** A sub shows when its module (and capability, when given) is granted. */
  subs: readonly (NavLink & { module?: Module; capability?: Capability })[];
}

const DEFS: readonly Def[] = [
  {
    key: 'home',
    label: 'Dashboard',
    icon: 'home',
    modules: null,
    href: '/dashboard',
    subs: [{ label: 'Dashboard', href: '/dashboard', module: 'DASHBOARD' }],
  },
  {
    key: 'daily-mis',
    label: 'Daily MIS',
    icon: 'daily',
    modules: ['DAILY_MIS'],
    href: '/daily-mis',
    subs: [
      { label: 'Daily MIS table', href: '/daily-mis' },
      {
        label: 'Daily MIS form',
        href: '/daily-mis/new',
        module: 'DAILY_MIS',
        capability: 'SUBMIT',
      },
      { label: 'Returned MIS', href: '/daily-mis/returned' },
      {
        label: 'Approval queue',
        href: '/daily-mis/approvals',
        module: 'DAILY_MIS',
        capability: 'APPROVE',
      },
    ],
  },
];

function visible(me: MeResponse, module: Module): boolean {
  return me.access.modules[module].length > 0;
}

export function buildNav(me: MeResponse): NavItem[] {
  const items: NavItem[] = [];
  let adminPanel = false;
  for (const d of DEFS) {
    if (d.modules !== null && !d.modules.some((m) => visible(me, m))) continue;
    const subs = d.subs
      .filter(
        (s) =>
          s.module === undefined ||
          (s.capability === undefined
            ? visible(me, s.module)
            : me.access.modules[s.module].includes(s.capability)),
      )
      .map(({ label, href }) => ({ label, href }));
    const firstAdmin = d.adminPanel === true && !adminPanel;
    if (firstAdmin) adminPanel = true;
    items.push({
      key: d.key,
      label: d.label,
      icon: d.icon,
      href: subs.find((s) => s.href !== null)?.href ?? d.href,
      subs,
      ...(firstAdmin ? { adminPanel: true } : {}),
    });
  }
  return items;
}

/** The item a path belongs to (for the active state). */
export function activeKey(items: readonly NavItem[], path: string): string | null {
  for (const i of items) {
    if (i.subs.some((s) => s.href === path) || i.href === path) return i.key;
  }
  // A record page (e.g. /daily-mis/<id>, /licences/internal) belongs to the item whose link
  // shares its first path segment.
  const first = (p: string): string => `/${p.split('/')[1] ?? ''}`;
  for (const i of items) {
    const links = [i.href, ...i.subs.map((s) => s.href)].filter(
      (h): h is string => h !== null && h !== '/dashboard',
    );
    if (links.some((h) => first(h) === first(path))) return i.key;
  }
  return null;
}
