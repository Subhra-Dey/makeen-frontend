// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { ACTIONS, MODULES, MODULE_SETTINGS, type Action, type Module } from '../access';
import { LOGIN_STATUSES, WORKING_STATUSES } from '../enums';

/** Exact texts for the People, Role access and Designation map screens. */
export const PEOPLE_MESSAGES = {
  plantRequired: 'Select at least one plant.',
  roleRequired: 'Select role',
  rolesRequired: 'Select role(s)',
  loginRequired: 'Select Active or Inactive.',
  remarksLong: 'Remarks can be at most 500 characters.',
  duplicatePlant: 'A plant is listed twice.',
  plantRoleOutside: 'A plant role was given for a plant that is not selected.',
  roleNameRequired: 'Enter a role name.',
  roleNameTaken: 'A role with this name already exists.',
  copyFromRequired: 'Choose the role to start access from.',
  designationRequired: 'Enter the KEKA designation.',
  designationUnknown: 'No one in the KEKA data has this designation.',
  adminRoleLocked: 'The Admin role always has full access and cannot be changed.',
  notStandardRole: 'Only the 14 go-live roles have a default to reset to.',
  staleVersion: 'Someone else changed this role. Reload it and try again.',
  selfChange: 'You cannot change your own plant, role or login.',
  adminOnly: 'Only an Admin can do this.',
  resignedCannotLogin: 'A resigned person cannot have an active login.',
  plantNotFound: 'One or more plants were not found.',
  roleNotFound: 'Role not found.',
  personNotFound: 'Person not found.',
  kekaApiNotConnected: 'The KEKA API is not connected yet. Load a CSV or Excel file instead.',
  fileType: 'Upload a CSV or Excel (.xlsx) file.',
  fileEmpty: 'The file has no rows.',
  fileTooManyRows: 'The file has more than 20,000 rows. Split it and load each part.',
  missingColumns: 'The file is missing required columns.',
} as const;

const remarks = z
  .string()
  .trim()
  .max(500, PEOPLE_MESSAGES.remarksLong)
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v));

const optionalSearch = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v));

const page = z.coerce.number().int().min(1).max(100_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(200).default(50);

/** People table filters (spec “Search filters per page” 9 / BTN-P8) + paging. */
export const peopleQuerySchema = z.object({
  plantId: z.uuid().optional(),
  roleId: z.uuid().optional(),
  loginStatus: z.enum(LOGIN_STATUSES).optional(),
  workingStatus: z.enum(WORKING_STATUSES).optional(),
  q: optionalSearch,
  sort: z.enum(['name', 'employeeCode', 'designation', 'lastLoginAt']).default('name'),
  dir: z.enum(['asc', 'desc']).default('asc'),
  page,
  pageSize,
});
export type PeopleQuery = z.infer<typeof peopleQuerySchema>;

/** User logins table filters (mockup: Login All / Active / Inactive). */
export const loginsQuerySchema = z.object({
  loginStatus: z.enum(LOGIN_STATUSES).optional(),
  q: optionalSearch,
  page,
  pageSize,
});
export type LoginsQuery = z.infer<typeof loginsQuerySchema>;

/**
 * Assign (PPL-A1…A4). The selected plants become the person's plants; each gets `roleId` unless
 * `plantRoles` gives that plant a different role (D-11 — a designation that maps to several roles).
 * `allPlants` = every plant that exists now (D-71).
 */
export const assignSchema = z
  .object({
    allPlants: z.boolean().default(false),
    plantIds: z.array(z.uuid()).max(1000).default([]),
    roleId: z.uuid({ error: PEOPLE_MESSAGES.roleRequired }),
    plantRoles: z
      .array(z.object({ plantId: z.uuid(), roleId: z.uuid() }))
      .max(1000)
      .default([]),
    loginStatus: z.enum(LOGIN_STATUSES, { error: PEOPLE_MESSAGES.loginRequired }),
    remarks,
  })
  .superRefine((v, ctx) => {
    if (!v.allPlants && v.plantIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['plantIds'], message: PEOPLE_MESSAGES.plantRequired });
    }
    if (new Set(v.plantIds).size !== v.plantIds.length) {
      ctx.addIssue({ code: 'custom', path: ['plantIds'], message: PEOPLE_MESSAGES.duplicatePlant });
    }
    const chosen = new Set(v.plantIds);
    const seen = new Set<string>();
    for (const [i, pr] of v.plantRoles.entries()) {
      if (seen.has(pr.plantId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['plantRoles', i, 'plantId'],
          message: PEOPLE_MESSAGES.duplicatePlant,
        });
      }
      seen.add(pr.plantId);
      if (!v.allPlants && !chosen.has(pr.plantId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['plantRoles', i, 'plantId'],
          message: PEOPLE_MESSAGES.plantRoleOutside,
        });
      }
    }
  });
export type AssignInput = z.infer<typeof assignSchema>;

/** Activate / Deactivate on User logins (ULG-T7). */
export const loginChangeSchema = z.object({ remarks });
export type LoginChangeInput = z.infer<typeof loginChangeSchema>;

const settingSchema = z.enum(MODULE_SETTINGS);
const moduleShape = Object.fromEntries(MODULES.map((m) => [m, settingSchema])) as Record<
  Module,
  typeof settingSchema
>;
const actionShape = Object.fromEntries(ACTIONS.map((a) => [a, z.boolean()])) as Record<
  Action,
  z.ZodBoolean
>;

/** Role screen Save changes (ROLE-6…8): every module and every action switch, plus the version read. */
export const roleAccessSchema = z.object({
  version: z.number().int().min(0),
  modules: z.strictObject(moduleShape),
  actions: z.strictObject(actionShape),
});
export type RoleAccessInput = z.infer<typeof roleAccessSchema>;

/** Reset role to default (ROLE-8). */
export const roleVersionSchema = z.object({ version: z.number().int().min(0) });
export type RoleVersionInput = z.infer<typeof roleVersionSchema>;

export const designationSchema = z
  .string({ error: PEOPLE_MESSAGES.designationRequired })
  .trim()
  .min(1, PEOPLE_MESSAGES.designationRequired)
  .max(120)
  .transform((v) => v.replace(/\s+/g, ' '));

/** Create new role (DSG-3). */
export const createRoleSchema = z.object({
  name: z
    .string({ error: PEOPLE_MESSAGES.roleNameRequired })
    .trim()
    .min(1, PEOPLE_MESSAGES.roleNameRequired)
    .max(80)
    .transform((v) => v.replace(/\s+/g, ' ')),
  copyFromRoleId: z.uuid({ error: PEOPLE_MESSAGES.copyFromRequired }),
  designations: z.array(designationSchema).max(50).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

/** Map a designation (DSG-1, DSG-2). An empty list un-maps it (those people cannot sign in). */
export const designationMapSchema = z.object({
  designation: designationSchema,
  roleIds: z.array(z.uuid()).max(30),
});
export type DesignationMapInput = z.infer<typeof designationMapSchema>;

/** KEKA load options. Multipart fields arrive as strings. */
export const importFileOptionsSchema = z.object({
  dryRun: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});
export const importApiOptionsSchema = z.object({ dryRun: z.boolean().default(true) });
