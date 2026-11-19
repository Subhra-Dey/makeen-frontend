import {
  ACTIONS,
  DEFAULT_MODULE_SETTINGS,
  MODULES,
  STANDARD_ROLES,
  capabilitiesOf,
  defaultActionAllowed,
  settingAllows,
} from './index';

describe('module settings are bundles, not a ladder (D-10)', () => {
  it('Approve gives view, download and approve — but not submit', () => {
    expect(capabilitiesOf('APPROVE')).toEqual(['VIEW', 'DOWNLOAD', 'APPROVE']);
    expect(settingAllows('APPROVE', 'SUBMIT')).toBe(false);
  });
  it('Submit does not give download; Hidden gives nothing', () => {
    expect(settingAllows('SUBMIT', 'DOWNLOAD')).toBe(false);
    expect(capabilitiesOf('HIDDEN')).toEqual([]);
  });
});

describe('go-live defaults (ROLE-D1…D7)', () => {
  it('loads exactly the 14 spec roles with a setting for every module', () => {
    expect(STANDARD_ROLES).toHaveLength(14);
    for (const role of STANDARD_ROLES) {
      expect(Object.keys(DEFAULT_MODULE_SETTINGS[role]).sort()).toEqual([...MODULES].sort());
    }
  });

  it('entry roles submit Daily MIS, Daily Exception and Monthly MIS only', () => {
    const m = DEFAULT_MODULE_SETTINGS['Maintenance Officer'];
    expect(m.DAILY_MIS).toBe('SUBMIT');
    expect(m.DAILY_EXCEPTIONS).toBe('SUBMIT');
    expect(m.MONTHLY_MIS).toBe('SUBMIT');
    expect(m.AUDIT).toBe('SEARCH');
  });

  it('Plant Manager approves MIS but does not type it; submits plant master, audit, licences', () => {
    const m = DEFAULT_MODULE_SETTINGS['Plant Manager'];
    expect(m.DAILY_MIS).toBe('APPROVE');
    expect(settingAllows(m.DAILY_MIS, 'SUBMIT')).toBe(false);
    expect([m.PLANT_MASTER, m.AUDIT, m.LICENCES]).toEqual(['SUBMIT', 'SUBMIT', 'SUBMIT']);
  });

  it('Safety roles submit Daily Exception and Audit', () => {
    for (const r of ['Safety Officer', 'Asst Manager HSSE'] as const) {
      expect(DEFAULT_MODULE_SETTINGS[r].DAILY_EXCEPTIONS).toBe('SUBMIT');
      expect(DEFAULT_MODULE_SETTINGS[r].AUDIT).toBe('SUBMIT');
      expect(DEFAULT_MODULE_SETTINGS[r].DAILY_MIS).toBe('DOWNLOAD');
    }
  });

  it('Management Review is Hidden except for Admin, Management, Zonal Manager, QHSE Head', () => {
    const visible = STANDARD_ROLES.filter(
      (r) => DEFAULT_MODULE_SETTINGS[r].MANAGEMENT_REVIEW !== 'HIDDEN',
    );
    expect(visible.sort()).toEqual(['Admin', 'Management', 'QHSE Head', 'Zonal Manager'].sort());
  });

  it('People and Notification control are Admin only; Staff search only', () => {
    for (const r of STANDARD_ROLES.filter((x) => x !== 'Admin')) {
      expect(DEFAULT_MODULE_SETTINGS[r].PEOPLE).toBe('HIDDEN');
      expect(DEFAULT_MODULE_SETTINGS[r].NOTIFICATION_CONTROL).toBe('HIDDEN');
    }
    expect(DEFAULT_MODULE_SETTINGS.Staff.DAILY_MIS).toBe('SEARCH');
  });

  it('action switches: Admin all; Plant Manager Return only; others none', () => {
    for (const a of ACTIONS) expect(defaultActionAllowed('Admin', a)).toBe(true);
    expect(defaultActionAllowed('Plant Manager', 'RETURN')).toBe(true);
    expect(defaultActionAllowed('Plant Manager', 'REOPEN_APPROVED')).toBe(false);
    expect(defaultActionAllowed('Safety Officer', 'RETURN')).toBe(false);
  });
});
