// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

/**
 * Access model (spec “Roles — who can do what”, DECISIONS D-10 / D-11 / D-12).
 * One setting per role per module. Settings are BUNDLES, not a ladder:
 *   SEARCH   → view
 *   SUBMIT   → view + enter
 *   DOWNLOAD → view + export
 *   APPROVE  → view + export + approve/return
 *   HIDDEN   → nothing (API answers 403 to every request for the module)
 * Admin is a flagged system role with every capability.
 */

export const MODULES = [
  'DASHBOARD',
  'DAILY_MIS',
  'MONTHLY_MIS',
  'DAILY_EXCEPTIONS',
  'MANAGEMENT_REVIEW',
  'PLANT_MASTER',
  'AUDIT',
  'LICENCES',
  'REVIEW_CHECK',
  'GRAPHS',
  'PEOPLE',
  'NOTIFICATION_CONTROL',
] as const;
export type Module = (typeof MODULES)[number];

export const MODULE_LABELS: Readonly<Record<Module, string>> = {
  DASHBOARD: 'Dashboard',
  DAILY_MIS: 'Daily MIS',
  MONTHLY_MIS: 'Monthly MIS',
  DAILY_EXCEPTIONS: 'Daily Exceptions',
  MANAGEMENT_REVIEW: 'Management Review',
  PLANT_MASTER: 'Plant master',
  AUDIT: 'Audit',
  LICENCES: 'Licences',
  REVIEW_CHECK: 'Review Check',
  GRAPHS: 'Graphs',
  PEOPLE: 'People',
  NOTIFICATION_CONTROL: 'Notification control',
};

export const MODULE_SETTINGS = ['SEARCH', 'SUBMIT', 'DOWNLOAD', 'APPROVE', 'HIDDEN'] as const;
export type ModuleSetting = (typeof MODULE_SETTINGS)[number];

export const CAPABILITIES = ['VIEW', 'SUBMIT', 'DOWNLOAD', 'APPROVE'] as const;
export type Capability = (typeof CAPABILITIES)[number];

const BUNDLES: Readonly<Record<ModuleSetting, readonly Capability[]>> = {
  SEARCH: ['VIEW'],
  SUBMIT: ['VIEW', 'SUBMIT'],
  DOWNLOAD: ['VIEW', 'DOWNLOAD'],
  APPROVE: ['VIEW', 'DOWNLOAD', 'APPROVE'],
  HIDDEN: [],
};

/** Capabilities granted by one module setting (D-10). */
export function capabilitiesOf(setting: ModuleSetting): readonly Capability[] {
  return BUNDLES[setting];
}

export function settingAllows(setting: ModuleSetting, capability: Capability): boolean {
  return BUNDLES[setting].includes(capability);
}

/** Sensitive action switches (spec “Sensitive actions: delete, reopen, replace file”). */
export const ACTIONS = [
  'RETURN',
  'DELETE_PLANT',
  'REOPEN_APPROVED',
  'REPLACE_FILE_AFTER_APPROVE',
  'READ_FILE_INTO_FIELDS',
] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS: Readonly<Record<Action, string>> = {
  RETURN: 'Return',
  DELETE_PLANT: 'Delete a plant',
  REOPEN_APPROVED: 'Reopen Approved row',
  REPLACE_FILE_AFTER_APPROVE: 'Replace file after Approve',
  READ_FILE_INTO_FIELDS: 'Read file into fields',
};

/** The 14 roles loaded at go-live (spec order). */
export const STANDARD_ROLES = [
  'Admin',
  'Plant Manager',
  'Dy Plant Incharge',
  'Maintenance Officer',
  'Operation Officer',
  'Sr. Operations and Maintenance Officer',
  'Accounts Officer',
  'Asst Manager HSSE',
  'Safety Officer',
  'QHSE Head',
  'FM Co-ordinator',
  'Zonal Manager',
  'Management',
  'Staff',
] as const;
export type StandardRole = (typeof STANDARD_ROLES)[number];

export const ADMIN_ROLE: StandardRole = 'Admin';

type Matrix = Readonly<Record<Module, ModuleSetting>>;

function matrix(
  base: ModuleSetting,
  overrides: Partial<Record<Module, ModuleSetting>> = {},
): Matrix {
  const out = {} as Record<Module, ModuleSetting>;
  for (const m of MODULES) out[m] = overrides[m] ?? base;
  // Admin-panel modules and Management Review are Hidden unless granted (ROLE-D6 / ROLE-D7).
  out.PEOPLE = overrides.PEOPLE ?? 'HIDDEN';
  out.NOTIFICATION_CONTROL = overrides.NOTIFICATION_CONTROL ?? 'HIDDEN';
  out.MANAGEMENT_REVIEW = overrides.MANAGEMENT_REVIEW ?? 'HIDDEN';
  return out;
}

const ENTRY = matrix('SEARCH', {
  DAILY_MIS: 'SUBMIT',
  DAILY_EXCEPTIONS: 'SUBMIT',
  MONTHLY_MIS: 'SUBMIT',
});
const SAFETY = matrix('DOWNLOAD', { DAILY_EXCEPTIONS: 'SUBMIT', AUDIT: 'SUBMIT' });
const SENIOR_READ = matrix('DOWNLOAD', { MANAGEMENT_REVIEW: 'DOWNLOAD' });

/** Default module settings at go-live (spec “Defaults loaded at go-live”, ROLE-D1…D7). */
export const DEFAULT_MODULE_SETTINGS: Readonly<Record<StandardRole, Matrix>> = {
  Admin: matrix('APPROVE', {
    MANAGEMENT_REVIEW: 'APPROVE',
    PEOPLE: 'APPROVE',
    NOTIFICATION_CONTROL: 'APPROVE',
  }),
  'Plant Manager': matrix('DOWNLOAD', {
    DAILY_MIS: 'APPROVE',
    MONTHLY_MIS: 'APPROVE',
    PLANT_MASTER: 'SUBMIT',
    AUDIT: 'SUBMIT',
    LICENCES: 'SUBMIT',
  }),
  'Dy Plant Incharge': ENTRY,
  'Maintenance Officer': ENTRY,
  'Operation Officer': ENTRY,
  'Sr. Operations and Maintenance Officer': ENTRY,
  'Accounts Officer': matrix('DOWNLOAD'),
  'Asst Manager HSSE': SAFETY,
  'Safety Officer': SAFETY,
  'QHSE Head': SENIOR_READ,
  'FM Co-ordinator': matrix('DOWNLOAD'),
  'Zonal Manager': SENIOR_READ,
  Management: SENIOR_READ,
  Staff: matrix('SEARCH'),
};

/** Default action switches: Yes for Admin; Return also Yes for Plant Manager; No otherwise. */
export function defaultActionAllowed(role: StandardRole, action: Action): boolean {
  if (role === 'Admin') return true;
  return role === 'Plant Manager' && action === 'RETURN';
}
