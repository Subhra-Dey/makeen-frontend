import { describe, expect, it } from 'vitest';
import { CAPABILITIES, MODULES, type Capability, type MeResponse, type Module } from '@/shared';
import { activeKey, buildNav } from './nav';
import { safeNext, loginUrl } from './navigation';
import { plantsLabel, roleSummary, rolesLabel } from './people';

function me(visible: Module[], extra: Partial<MeResponse> = {}): MeResponse {
  const modules = Object.fromEntries(
    MODULES.map((m) => [m, visible.includes(m) ? [...CAPABILITIES] : []]),
  ) as Record<Module, Capability[]>;
  return {
    user: {
      id: 'u',
      employeeCode: 'MEI-1',
      name: 'Asha Nair',
      email: 'asha.nair@makeenenergy.com',
      phone: null,
      aadhaar: null,
      designation: 'Maintenance Officer',
      photoUrl: null,
      loginStatus: 'ACTIVE',
      workingStatus: 'WORKING',
      lastLoginAt: null,
    },
    role: { id: 'r', name: 'Maintenance Officer' },
    isAdmin: false,
    plants: [],
    access: { modules, actions: [] },
    ...extra,
  };
}

describe('left menu (ROLE-9: Hidden → no menu item)', () => {
  it('shows only modules that are not Hidden, plus the always-on home group', () => {
    const items = buildNav(me(['DASHBOARD', 'DAILY_MIS']));
    expect(items.map((i) => i.key)).toEqual(['home', 'daily-mis']);
  });

  it('keeps Dashboard as the home link', () => {
    const [home] = buildNav(me([]));
    expect(home?.subs.map((s) => s.label)).toEqual([]);
    expect(home?.href).toBe('/dashboard');
  });

  it('does not add modules outside this demo', () => {
    const items = buildNav(me(['PEOPLE', 'AUDIT', 'DAILY_MIS']));
    expect(items.map((i) => i.key)).toEqual(['home', 'daily-mis']);
  });
});

describe('safeNext (no open redirect)', () => {
  it.each([
    ['/people?x=1', '/people?x=1'],
    ['https://evil.example', '/dashboard'],
    ['//evil.example', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['/login', '/dashboard'],
    [null, '/dashboard'],
  ])('%s → %s', (input, out) => {
    expect(safeNext(input)).toBe(out);
  });

  it('builds a login URL that returns to the page', () => {
    expect(loginUrl('/people')).toBe('/login?next=%2Fpeople');
    expect(loginUrl('//x')).toBe('/login');
  });
});

describe('people labels', () => {
  it('summarises role and plants for the header', () => {
    expect(roleSummary(me([], { isAdmin: true, role: { id: 'a', name: 'Admin' } }))).toBe(
      'Admin · All plants',
    );
    const one = me([], {
      plants: [
        {
          plantId: 'p',
          name: 'HPCL Yediyur',
          code: 'HPY-011',
          role: { id: 'r', name: 'Plant Manager' },
        },
      ],
    });
    expect(roleSummary(one)).toBe('Maintenance Officer · HPCL Yediyur');
  });

  it('shows plants as “first +N” and distinct roles', () => {
    const row = {
      role: { id: 'a', name: 'Maintenance Officer' },
      plants: [
        {
          id: '1',
          name: 'HPCL Yediyur',
          code: 'A',
          role: { id: 'a', name: 'Maintenance Officer' },
        },
        { id: '2', name: 'HPCL Barhi', code: 'B', role: { id: 'b', name: 'Plant Manager' } },
      ],
    };
    expect(plantsLabel(row)).toBe('HPCL Yediyur +1');
    expect(plantsLabel(row, true)).toBe('HPCL Yediyur, HPCL Barhi');
    const many = {
      plants: [...row.plants, { id: '3', name: 'IOCL Korba', code: 'C', role: row.role }],
    };
    expect(plantsLabel(many, true)).toBe('3 plants');
    expect(rolesLabel(row)).toBe('Maintenance Officer, Plant Manager');
    expect(plantsLabel({ plants: [] })).toBe('—');
  });
});
