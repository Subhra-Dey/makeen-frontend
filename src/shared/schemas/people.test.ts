// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { MODULES, ACTIONS } from '../access';
import {
  KEKA_MESSAGES,
  isValidAadhaar,
  kekaColumnFor,
  kekaRowSchema,
  normaliseIndianMobile,
  verhoeffCheckDigit,
} from './keka';
import {
  PEOPLE_MESSAGES,
  assignSchema,
  createRoleSchema,
  importFileOptionsSchema,
  peopleQuerySchema,
  roleAccessSchema,
} from './people';

const U1 = '0190a000-0000-7000-8000-000000000001';
const U2 = '0190a000-0000-7000-8000-000000000002';
const U3 = '0190a000-0000-7000-8000-000000000003';

/** A Verhoeff-valid 12-digit number built from an 11-digit body. */
const aadhaar = (body11: string): string => `${body11}${verhoeffCheckDigit(body11)}`;

describe('Verhoeff / Aadhaar', () => {
  it('matches the published Verhoeff example (236 → 3)', () => {
    expect(verhoeffCheckDigit('236')).toBe(3);
  });

  it('accepts a checksum-valid number and rejects one wrong digit or a 0/1 first digit', () => {
    const ok = aadhaar('23456789012');
    expect(isValidAadhaar(ok)).toBe(true);
    const flipped = `${ok.slice(0, 5)}${(Number(ok[5]) + 1) % 10}${ok.slice(6)}`;
    expect(isValidAadhaar(flipped)).toBe(false);
    expect(isValidAadhaar(aadhaar('12345678901'))).toBe(false);
    expect(isValidAadhaar('2345')).toBe(false);
  });
});

describe('normaliseIndianMobile', () => {
  it.each([
    ['98123 45621', '9812345621'],
    ['+91-98123-45621', '9812345621'],
    ['919812345621', '9812345621'],
    ['09812345621', '9812345621'],
  ])('%s → %s', (input, out) => {
    expect(normaliseIndianMobile(input)).toBe(out);
  });

  it('rejects landlines and short numbers', () => {
    expect(normaliseIndianMobile('0802345678')).toBeNull();
    expect(normaliseIndianMobile('12345')).toBeNull();
  });
});

describe('KEKA headers', () => {
  it('matches spec headers ignoring case, spaces and punctuation', () => {
    expect(kekaColumnFor('Employee name')).toBe('name');
    expect(kekaColumnFor('EMPLOYEE CODE')).toBe('employeeCode');
    expect(kekaColumnFor('Working / Resigned')).toBe('workingStatus');
    expect(kekaColumnFor('Aadhaar no')).toBe('aadhaar');
    expect(kekaColumnFor('Photo')).toBeNull();
  });
});

describe('kekaRowSchema', () => {
  const valid = {
    name: ' Asha Nair ',
    employeeCode: 'mei-00733',
    email: 'Asha.Nair@makeenenergy.com',
    phone: '+91 98765 43245',
    aadhaar: aadhaar('28765432110').replace(/(\d{4})(?=\d)/g, '$1 '),
    designation: 'Maintenance   Officer',
    workingStatus: 'Working',
  };

  it('normalises a good row', () => {
    const r = kekaRowSchema.parse(valid);
    expect(r).toMatchObject({
      name: 'Asha Nair',
      employeeCode: 'MEI-00733',
      email: 'asha.nair@makeenenergy.com',
      phone: '9876543245',
      designation: 'Maintenance Officer',
      workingStatus: 'WORKING',
    });
    expect(r.aadhaar).toMatch(/^\d{12}$/);
  });

  it('treats blank phone / Aadhaar as missing', () => {
    const r = kekaRowSchema.parse({ ...valid, phone: ' ', aadhaar: '' });
    expect(r.phone).toBeUndefined();
    expect(r.aadhaar).toBeUndefined();
  });

  it('reports each bad field with its own message', () => {
    const r = kekaRowSchema.safeParse({
      ...valid,
      phone: '12345',
      aadhaar: '123412341234',
      workingStatus: 'On leave',
    });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        KEKA_MESSAGES.phoneInvalid,
        KEKA_MESSAGES.aadhaarInvalid,
        KEKA_MESSAGES.statusInvalid,
      ]),
    );
  });
});

describe('assignSchema', () => {
  it('requires a plant unless all plants are chosen', () => {
    const r = assignSchema.safeParse({ roleId: U1, loginStatus: 'ACTIVE' });
    expect(r.success).toBe(false);
    expect(r.success ? '' : r.error.issues[0]?.message).toBe(PEOPLE_MESSAGES.plantRequired);
    expect(
      assignSchema.safeParse({ allPlants: true, roleId: U1, loginStatus: 'ACTIVE' }).success,
    ).toBe(true);
  });

  it('requires role and login with the spec texts', () => {
    const r = assignSchema.safeParse({ plantIds: [U2] });
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([PEOPLE_MESSAGES.roleRequired, PEOPLE_MESSAGES.loginRequired]),
    );
  });

  it('rejects a per-plant role for a plant that is not selected', () => {
    const r = assignSchema.safeParse({
      plantIds: [U2],
      roleId: U1,
      plantRoles: [{ plantId: U3, roleId: U1 }],
      loginStatus: 'ACTIVE',
    });
    expect(r.success).toBe(false);
  });
});

describe('roleAccessSchema', () => {
  const full = {
    version: 0,
    modules: Object.fromEntries(MODULES.map((m) => [m, 'SEARCH'])),
    actions: Object.fromEntries(ACTIONS.map((a) => [a, false])),
  };

  it('needs every module and every action switch', () => {
    expect(roleAccessSchema.safeParse(full).success).toBe(true);
    const partial = Object.fromEntries(
      Object.entries(full.modules).filter(([m]) => m !== 'DASHBOARD'),
    );
    expect(roleAccessSchema.safeParse({ ...full, modules: partial }).success).toBe(false);
  });

  it('refuses unknown modules and settings', () => {
    expect(
      roleAccessSchema.safeParse({ ...full, modules: { ...full.modules, SECRET: 'SEARCH' } })
        .success,
    ).toBe(false);
    expect(
      roleAccessSchema.safeParse({ ...full, modules: { ...full.modules, GRAPHS: 'ALL' } }).success,
    ).toBe(false);
  });
});

describe('other People schemas', () => {
  it('createRoleSchema trims and requires a name and a source role', () => {
    expect(createRoleSchema.parse({ name: '  Auditor  ', copyFromRoleId: U1 })).toEqual({
      name: 'Auditor',
      copyFromRoleId: U1,
      designations: [],
    });
    expect(createRoleSchema.safeParse({ name: '', copyFromRoleId: U1 }).success).toBe(false);
  });

  it('peopleQuerySchema coerces paging and drops an empty search', () => {
    expect(peopleQuerySchema.parse({ page: '2', q: '  ' })).toMatchObject({
      page: 2,
      pageSize: 50,
      q: undefined,
    });
  });

  it('import options default to a dry run', () => {
    expect(importFileOptionsSchema.parse({})).toEqual({ dryRun: true });
    expect(importFileOptionsSchema.parse({ dryRun: 'false' })).toEqual({ dryRun: false });
  });
});
