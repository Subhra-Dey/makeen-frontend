// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import {
  CYLINDER_SIZES,
  CYLINDER_STAT_CATEGORIES,
  INVENTORY_ITEMS,
  REPORT_STATUSES,
  type CylinderSize,
  type CylinderStatCategory,
  type InventoryItem,
} from '../enums';
import { MONTHLY_MIS_INPUT_FIELDS, type MonthlyMisInputKey } from '../fields/monthly-mis';
import type { FieldDef } from '../fields/types';
import { isFutureIstMonth, isIsoMonth } from '../ist';
import { sumInts } from '../decimal';
import { FIELD_MESSAGES, decimalValue, intValue, valueSchemaFor } from './field-values';

export const MONTHLY_MIS_MESSAGES = {
  monthRequired: 'Choose the month and year.',
  monthInvalid: 'Choose a real month (Month yyyy).',
  monthFuture: 'The month cannot be in the future (India time).',
  penaltyReasonRequired: 'Enter the reason and amount when penalties were incurred.',
  solarCapacityRequired: 'Enter the solar capacity when a solar plant is available.',
  alreadyExists: 'A Monthly MIS for this plant and month already exists. Open it instead.',
  locked: 'This Monthly MIS is Approved and locked. Only a reopen with a reason can change it.',
  stale: 'Someone else saved this Monthly MIS. Reload it and try again.',
  notPending: 'Only a Pending Monthly MIS can be approved or returned.',
  notApproved: 'Only an Approved Monthly MIS can be reopened.',
  plantMonthFixed: 'Plant and month cannot change after the report is submitted.',
  notFound: 'Monthly MIS not found.',
} as const;

/** Block B fields the person types (26–69 and 122, without the system sum 47). */
export const MONTHLY_MIS_VALUE_FIELDS = MONTHLY_MIS_INPUT_FIELDS.filter(
  (f: FieldDef) => f.readOnly !== true,
);
export type MonthlyMisValueKey = Exclude<MonthlyMisInputKey, 'trainingTotal'>;
export type MonthlyMisValues = Record<MonthlyMisValueKey, string | number | null>;

const valueShape = Object.fromEntries(
  MONTHLY_MIS_VALUE_FIELDS.map((f) => [f.key, valueSchemaFor(f)]),
) as Record<MonthlyMisValueKey, ReturnType<typeof valueSchemaFor>>;

/** Block B values; unknown keys (and the system total 47) are dropped. */
export const monthlyMisValuesSchema = z.object(valueShape);

/** Items 70–104: count per category × cylinder size (two separate 35 kg columns). */
export type CylinderGrid = Record<CylinderStatCategory, Record<CylinderSize, number | null>>;

const sizeShape = Object.fromEntries(CYLINDER_SIZES.map((s) => [s, intValue()])) as Record<
  CylinderSize,
  ReturnType<typeof intValue>
>;
const sizeRow = z.object(sizeShape).default({} as never);
const cylinderShape = Object.fromEntries(
  CYLINDER_STAT_CATEGORIES.map((c) => [c, sizeRow]),
) as Record<CylinderStatCategory, typeof sizeRow>;

export const cylinderGridSchema = z.object(cylinderShape);

/** Items 105–121: parts and spares are whole numbers (nos); DPT paints are litres (2 dp). */
export function inventoryKind(item: InventoryItem): 'count' | 'litres' {
  return item.startsWith('DPT_') ? 'litres' : 'count';
}
export type InventoryValues = Record<InventoryItem, string | number | null>;

const inventoryShape = Object.fromEntries(
  INVENTORY_ITEMS.map((i) => [
    i,
    inventoryKind(i) === 'count' ? intValue() : decimalValue('litres', 2),
  ]),
) as Record<InventoryItem, ReturnType<typeof intValue> | ReturnType<typeof decimalValue>>;

export const inventorySchema = z.object(inventoryShape);

/** Calendar month `yyyy-MM`, never after the current India month (MMIS-H2). */
export function pastIsoMonth() {
  return z
    .string({ error: MONTHLY_MIS_MESSAGES.monthRequired })
    .trim()
    .min(1, { error: MONTHLY_MIS_MESSAGES.monthRequired, abort: true })
    .refine((v) => isIsoMonth(v), { error: MONTHLY_MIS_MESSAGES.monthInvalid, abort: true })
    .refine((v) => !isFutureIstMonth(v), MONTHLY_MIS_MESSAGES.monthFuture);
}

/**
 * Save draft / Submit for approval (MMIS-R1). On Submit, penalty Yes needs its reason and solar
 * Yes needs its capacity (UXV-10); a Draft may be incomplete.
 */
export const monthlyMisSaveSchema = z
  .object({
    action: z.enum(['draft', 'submit']),
    version: z.number().int().min(1).optional(),
    plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
    month: pastIsoMonth(),
    values: monthlyMisValuesSchema.default({} as never),
    cylinders: cylinderGridSchema.default({} as never),
    inventory: inventorySchema.default({} as never),
  })
  .superRefine((v, ctx) => {
    if (v.action !== 'submit') return;
    const blank = (x: unknown): boolean => x === null || x === undefined || x === '';
    if (v.values.penaltyIncurred === 'YES' && blank(v.values.penaltyDetails)) {
      ctx.addIssue({
        code: 'custom',
        path: ['values', 'penaltyDetails'],
        message: MONTHLY_MIS_MESSAGES.penaltyReasonRequired,
      });
    }
    if (v.values.solarAvailable === 'YES' && blank(v.values.solarCapacity)) {
      ctx.addIssue({
        code: 'custom',
        path: ['values', 'solarCapacity'],
        message: MONTHLY_MIS_MESSAGES.solarCapacityRequired,
      });
    }
  });
export type MonthlyMisSaveInput = z.infer<typeof monthlyMisSaveSchema>;

const monthlyFilterShape = z.object({
  plantId: z.uuid().optional(),
  month: z
    .string()
    .refine((v) => isIsoMonth(v), MONTHLY_MIS_MESSAGES.monthInvalid)
    .optional(),
  status: z.enum(REPORT_STATUSES).optional(),
});
export type MonthlyMisFilter = z.infer<typeof monthlyFilterShape>;

/** Monthly MIS table filters (BTN-P2): plant, month and year, status. */
export const monthlyMisQuerySchema = monthlyFilterShape.extend({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type MonthlyMisQuery = z.infer<typeof monthlyMisQuerySchema>;

export const monthlyMisExportSchema = monthlyFilterShape.extend({
  format: z.enum(['xlsx', 'pdf']),
});

/** Live Cumulative Daily Summary for a plant + month (the new form, before the first save). */
export const monthlySummaryQuerySchema = z.object({ plantId: z.uuid(), month: pastIsoMonth() });

/** Item 47 = Σ 44–46 (accepts what a form holds). */
export function trainingTotalOf(
  values: Partial<Record<MonthlyMisValueKey, string | number | null>>,
): number {
  const int = (v: string | number | null | undefined): number | null => {
    if (typeof v === 'number') return Number.isInteger(v) ? v : null;
    if (typeof v !== 'string') return null;
    const t = v.trim().replace(/,/g, '');
    return /^\d+$/.test(t) ? Number(t) : null;
  };
  return sumInts([
    int(values.trainingStaff),
    int(values.trainingWorkmen),
    int(values.trainingDrivers),
  ]);
}
