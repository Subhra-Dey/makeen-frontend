// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import {
  AUDIT_FREQUENCIES,
  AUDIT_TYPES,
  EQUIPMENT_TYPES,
  LICENCE_CATEGORIES,
  LICENCE_TYPES,
  OBSERVATION_STATUSES,
  PLANT_STATUSES,
  RENEWAL_FREQUENCIES,
  VOLUME_TYPES,
  type EquipmentType,
} from '../enums';
import { financialYearOf, isIsoDate, istToday } from '../ist';
import { CHECK_STATUSES, LICENCE_STATUSES } from '../rules/operations';
import { FIELD_MESSAGES, decimalValue, intValue, textValue } from './field-values';

export const OPERATIONS_MESSAGES = {
  plantNameRequired: 'Enter the plant name.',
  plantAddressRequired: 'Enter the plant address.',
  plantCodeRequired: 'Enter the plant code (letters, numbers and -).',
  managerRequired: 'Select person',
  contractDateRequired: 'Enter the contract date (dd-mm-yyyy).',
  periodRequired: 'Enter the period of contract, 1 to 50 years.',
  extensionRange: 'Enter 0 to 50 years.',
  plantNameTaken: 'A plant with this name already exists.',
  plantCodeTaken: 'A plant with this code already exists.',
  userHasNoRole: 'This person has no role yet. Give them one in People first.',
  deleteReasonRequired: 'Type the reason for deleting the plant.',
  plantNotFound: 'Plant not found.',
  fyInvalid: 'Choose a financial year (e.g. 2026-27).',
  fyDuplicate: 'Each year can appear only once in this list.',
  headingRequired: 'Enter a heading.',
  auditNotFound: 'Audit not found.',
  recommendationsRequired: 'Enter the total number of recommendations.',
  startRequired: 'Enter the start date (dd-mm-yyyy).',
  endRequired: 'Enter the end date (dd-mm-yyyy).',
  endBeforeStart: 'The end date cannot be before the start date.',
  revisedBeforeTarget: 'The revised target date cannot be before the target date.',
  observationNotFound: 'This observation no longer exists. Reload the audit.',
  licenceNotFound: 'Licence not found.',
  licenceTypeWrongTab: 'Choose a licence type of this tab.',
  itemRequired: 'Choose the title / item.',
  itemWrongType: 'This title / item does not belong to the chosen licence type.',
  remindRequired: 'Enter the number of days (0 or more).',
  remindUsersRequired: 'Select at least one person to remind.',
  stale: 'Someone else saved this record. Reload it and try again.',
  fileType: 'Upload a PDF, JPG, PNG or XLSX file of at most 10 MB.',
  imageType: 'Upload a JPG or PNG image of at most 10 MB.',
} as const;

const required = (message: string) => z.string({ error: message }).trim().min(1, message);
const isoDate = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid);
const optionalDate = () =>
  z
    .string()
    .nullable()
    .optional()
    .transform((v, ctx): string | null => {
      if (v === null || v === undefined || v.trim() === '') return null;
      if (!isIsoDate(v.trim())) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.dateInvalid });
        return z.NEVER;
      }
      return v.trim();
    });

/** India FY label `2026-27`: the second part is the next year (D-36). */
export function isFinancialYear(v: string): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  return m !== null && (Number(m[1]) + 1) % 100 === Number(m[2]);
}

/** FY dropdown: the current FY and the 5 before it, newest first (D-36). */
export function financialYearOptions(today: string = istToday()): string[] {
  const start = Number(financialYearOf(today).slice(0, 4));
  return [0, 1, 2, 3, 4, 5].map(
    (i) => `${String(start - i)}-${String((start - i + 1) % 100).padStart(2, '0')}`,
  );
}

const fy = () =>
  z
    .string({ error: OPERATIONS_MESSAGES.fyInvalid })
    .refine(isFinancialYear, OPERATIONS_MESSAGES.fyInvalid);

// ───────────────────────────────────────────── Plant master (PLT-C1…C12)

const plantCode = z
  .string({ error: OPERATIONS_MESSAGES.plantCodeRequired })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{1,19}$/, OPERATIONS_MESSAGES.plantCodeRequired);

/** Create / edit a plant (Admin). Start and end dates are computed, never sent (PLT-C9, C10). */
export const plantSaveSchema = z.object({
  name: required(OPERATIONS_MESSAGES.plantNameRequired).max(120, FIELD_MESSAGES.tooLong(120)),
  address: required(OPERATIONS_MESSAGES.plantAddressRequired).max(400, FIELD_MESSAGES.tooLong(400)),
  code: plantCode,
  managerId: z.uuid({ error: OPERATIONS_MESSAGES.managerRequired }),
  userIds: z.array(z.uuid()).max(200).default([]),
  contractDate: isoDate(OPERATIONS_MESSAGES.contractDateRequired),
  periodYears: z.coerce
    .number({ error: OPERATIONS_MESSAGES.periodRequired })
    .int(OPERATIONS_MESSAGES.periodRequired)
    .min(1, OPERATIONS_MESSAGES.periodRequired)
    .max(50, OPERATIONS_MESSAGES.periodRequired),
  extensionYears: z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v, ctx): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 50) {
        ctx.addIssue({ code: 'custom', message: OPERATIONS_MESSAGES.extensionRange });
        return z.NEVER;
      }
      return n;
    }),
  status: z.enum(PLANT_STATUSES, { error: FIELD_MESSAGES.option }),
});
export type PlantSaveInput = z.infer<typeof plantSaveSchema>;

export const plantDeleteSchema = z.object({
  reason: required(OPERATIONS_MESSAGES.deleteReasonRequired).max(500, FIELD_MESSAGES.tooLong(500)),
});

export const plantQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(PLANT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type PlantQuery = z.infer<typeof plantQuerySchema>;

const volumeRow = z.object({
  type: z.enum(VOLUME_TYPES),
  fy: fy(),
  volumeMt: decimalValue('mt', 3).refine((v) => v !== null, FIELD_MESSAGES.number),
});

const equipmentRow = z.object({
  quantity: intValue().transform((v) => v ?? 0),
  note: textValue(300),
});

/** Plant details (PLT-D1…D18) — Plant Manager. */
export const plantDetailsSchema = z
  .object({
    capacity: decimalValue('mt', 3),
    production: decimalValue('mt', 3),
    volumes: z.array(volumeRow).max(60).default([]),
    equipment: z
      .object(
        Object.fromEntries(
          EQUIPMENT_TYPES.map((e) => [e, equipmentRow.default({ quantity: 0, note: null })]),
        ) as Record<EquipmentType, z.ZodDefault<typeof equipmentRow>>,
      )
      .default({} as never),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.volumes.forEach((row, i) => {
      const k = `${row.type}|${row.fy}`;
      if (seen.has(k))
        ctx.addIssue({
          code: 'custom',
          path: ['volumes', i, 'fy'],
          message: OPERATIONS_MESSAGES.fyDuplicate,
        });
      seen.add(k);
    });
  });
export type PlantDetailsInput = z.infer<typeof plantDetailsSchema>;

/** Plant activity (PLT-D19): heading, description; images are uploaded to it afterwards. */
export const plantActivitySchema = z.object({
  heading: required(OPERATIONS_MESSAGES.headingRequired).max(200, FIELD_MESSAGES.tooLong(200)),
  description: textValue(5000),
});

// ───────────────────────────────────────────── Audit (AUD-H1…H8, AUD-O1…O10)

const observationSchema = z.object({
  /** Present for a saved observation; absent for a new one. */
  id: z.uuid().optional(),
  subGroupCode: textValue(40),
  checklistRef: textValue(80),
  particular: textValue(500),
  observation: textValue(2000),
  recommendation: textValue(2000),
  actionPlan: textValue(2000),
  targetDate: optionalDate(),
  revisedTargetDate: optionalDate(),
  status: z.enum(OBSERVATION_STATUSES, { error: FIELD_MESSAGES.option }),
});
export type ObservationInput = z.infer<typeof observationSchema>;

function checkDates(
  v: { startDate?: string | null; endDate?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (v.startDate && v.endDate && v.endDate < v.startDate)
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: OPERATIONS_MESSAGES.endBeforeStart,
    });
}

export const auditSaveSchema = z
  .object({
    version: z.number().int().min(1).optional(),
    plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
    auditType: z.enum(AUDIT_TYPES, { error: FIELD_MESSAGES.option }),
    frequency: z.enum(AUDIT_FREQUENCIES, { error: FIELD_MESSAGES.option }),
    fy: fy().refine((v) => financialYearOptions().includes(v), OPERATIONS_MESSAGES.fyInvalid),
    totalRecommendations: z.coerce
      .number({ error: OPERATIONS_MESSAGES.recommendationsRequired })
      .int(FIELD_MESSAGES.whole)
      .min(0, FIELD_MESSAGES.negative)
      .max(100_000, FIELD_MESSAGES.tooLarge),
    startDate: isoDate(OPERATIONS_MESSAGES.startRequired),
    endDate: isoDate(OPERATIONS_MESSAGES.endRequired),
    observations: z.array(observationSchema).max(500).default([]),
  })
  .superRefine((v, ctx) => {
    checkDates(v, ctx);
    v.observations.forEach((o, i) => {
      if (o.targetDate && o.revisedTargetDate && o.revisedTargetDate < o.targetDate)
        ctx.addIssue({
          code: 'custom',
          path: ['observations', i, 'revisedTargetDate'],
          message: OPERATIONS_MESSAGES.revisedBeforeTarget,
        });
    });
  });
export type AuditSaveInput = z.infer<typeof auditSaveSchema>;

/** Audit table filters (BTN-P6): plant, audit, FY, status of its observations. */
export const AUDIT_STATUS_FILTERS = ['COMPLIED', 'PENDING', 'OVERDUE'] as const;
export const auditQuerySchema = z.object({
  plantId: z.uuid().optional(),
  auditType: z.enum(AUDIT_TYPES).optional(),
  fy: fy().optional(),
  status: z.enum(AUDIT_STATUS_FILTERS).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type AuditFilter = Omit<AuditQuery, 'page' | 'pageSize'>;
export const auditExportSchema = auditQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({ format: z.enum(['xlsx', 'pdf']) });

// ───────────────────────────────────────────── Licences (LIC-F1…F12)

export const licenceSaveSchema = z
  .object({
    version: z.number().int().min(1).optional(),
    plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
    licenceType: z.enum(LICENCE_TYPES, { error: FIELD_MESSAGES.option }),
    itemId: z.uuid({ error: OPERATIONS_MESSAGES.itemRequired }),
    docRef: textValue(80),
    notes: textValue(1000),
    startDate: optionalDate(),
    endDate: optionalDate(),
    frequency: z.enum(RENEWAL_FREQUENCIES, { error: FIELD_MESSAGES.option }),
    remindBeforeDays: z.coerce
      .number({ error: OPERATIONS_MESSAGES.remindRequired })
      .int(OPERATIONS_MESSAGES.remindRequired)
      .min(0, OPERATIONS_MESSAGES.remindRequired)
      .max(3650, FIELD_MESSAGES.atMost(3650)),
    remindUserIds: z
      .array(z.uuid())
      .min(1, OPERATIONS_MESSAGES.remindUsersRequired)
      .max(50)
      .transform((ids) => [...new Set(ids)]),
  })
  .superRefine(checkDates);
export type LicenceSaveInput = z.infer<typeof licenceSaveSchema>;

/** Licences table filters (BTN-P7): tab, plant, licence type, status. */
export const licenceQuerySchema = z.object({
  category: z.enum(LICENCE_CATEGORIES),
  plantId: z.uuid().optional(),
  licenceType: z.enum(LICENCE_TYPES).optional(),
  status: z.enum(LICENCE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type LicenceQuery = z.infer<typeof licenceQuerySchema>;
export type LicenceFilter = Omit<LicenceQuery, 'page' | 'pageSize'>;
export const licenceExportSchema = licenceQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({ format: z.enum(['xlsx', 'pdf']) });

export const remindOptionsQuerySchema = z.object({ plantId: z.uuid() });

// ───────────────────────────────────────────── Review Check (RC-1…RC-3)

export const reviewCheckQuerySchema = z.object({
  plantId: z.uuid().optional(),
  status: z.enum(CHECK_STATUSES).optional(),
});
export type ReviewCheckFilter = z.infer<typeof reviewCheckQuerySchema>;
export const reviewCheckExportSchema = reviewCheckQuerySchema.extend({
  format: z.enum(['xlsx', 'pdf']),
});
