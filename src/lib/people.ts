import type { MeResponse, PersonRow } from '@/shared';

/** “Admin · All plants”, “Plant Manager · HPCL Yediyur”, “Zonal Manager · 8 plants”. */
export function roleSummary(me: MeResponse): string {
  const role = me.role?.name ?? me.plants[0]?.role.name ?? 'No role';
  const where = me.isAdmin
    ? 'All plants'
    : me.plants.length === 0
      ? 'No plant'
      : me.plants.length === 1
        ? (me.plants[0]?.name ?? '')
        : `${me.plants.length} plants`;
  return `${role} · ${where}`;
}

/**
 * Plant cell. Compact (User logins): “HPCL Yediyur”, “HPCL Yediyur +1”. Listed (People table, as
 * in the mockup): up to two names, then “8 plants”.
 */
export function plantsLabel(row: Pick<PersonRow, 'plants'>, listed = false): string {
  if (row.plants.length === 0) return '—';
  if (listed) {
    return row.plants.length <= 2
      ? row.plants.map((p) => p.name).join(', ')
      : `${row.plants.length} plants`;
  }
  const [first] = row.plants;
  return row.plants.length === 1
    ? (first?.name ?? '')
    : `${first?.name ?? ''} +${row.plants.length - 1}`;
}

/** Role cell: base role, or the distinct plant roles when they differ. */
export function rolesLabel(row: Pick<PersonRow, 'role' | 'plants'>): string {
  const names = new Set(row.plants.map((p) => p.role.name));
  if (row.role) names.add(row.role.name);
  return names.size === 0 ? '—' : [...names].join(', ');
}
