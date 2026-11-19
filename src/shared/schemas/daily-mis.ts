// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { sumDecimals } from '../decimal';
import { REPORT_STATUSES } from '../enums';
import { DAILY_MIS_FIELDS, type DailyMisFieldKey } from '../fields/daily-mis';
import type { FieldDef } from '../fields/types';
import { isIsoDate } from '../ist';
import { computeDailyMisDerived, type DailyMisDerived } from '../rules/daily-mis';
import { FIELD_MESSAGES, pastIsoDate, valueSchemaFor } from './field-values';

/** Exact texts for the Daily MIS screens and the approval queue. */
export const DAILY_MIS_MESSAGES = {
  returnReasonPlaceholder: 'Type the reason before pressing Return…',
  returnReasonRequired: 'Type the reason before pressing Return.',
  reopenReasonRequired: 'Type the reason for reopening.',
  alreadySubmitted:
    'A Daily MIS for this plant and date is already submitted. Open that row instead.',
  locked: 'This Daily MIS is Approved and locked. Only a reopen with a reason can change it.',
  stale: 'Someone else saved this Daily MIS. Reload it and try again.',
  notPending: 'Only a Pending Daily MIS can be approved or returned.',
  notApproved: 'Only an Approved Daily MIS can be reopened.',
  plantDateFixed: 'Plant and date cannot change after the report is submitted.',
  notFound: 'Daily MIS not found.',
  rangeOrder: 'The “to” date must be on or after the “from” date.',
  rangeTooLong: 'Choose at most 366 days.',
} as const;

/** Fields the person types (1–60 minus plant, date and the system-shown / computed ones). */
export const DAILY_MIS_VALUE_FIELDS = DAILY_MIS_FIELDS.filter(
  (f: FieldDef) => f.readOnly !== true && f.key !== 'plantId' && f.key !== 'reportDate',
);
export type DailyMisValueKey = Exclude<
  DailyMisFieldKey,
  | 'plantId'
  | 'reportDate'
  | 'monthYear'
  | 'updatedAt'
  | 'enteredBy'
  | 'status'
  | 'closingBookStock'
  | 'stockGainLoss'
  | 'lossMechanicalTotal'
  | 'lossElectricalTotal'
  | 'lossMiscTotal'
  | 'mrTotal'
>;

const valueShape = Object.fromEntries(
  DAILY_MIS_VALUE_FIELDS.map((f) => [f.key, valueSchemaFor(f)]),
) as Record<DailyMisValueKey, ReturnType<typeof valueSchemaFor>>;

/**
 * The typed values of one Daily MIS. Unknown keys — including every system total — are dropped,
 * so a client can never send a computed value (SEC-14, DMIS-R5).
 */
export const dailyMisValuesSchema = z.object(valueShape);
/** Normalised values: decimals as fixed-decimal strings, counts as numbers, text trimmed. */
export type DailyMisValues = Record<DailyMisValueKey, string | number | null>;

/** Save draft / Submit for approval (DMIS-R1, DMIS-R2). `version` is required on updates. */
export const dailyMisSaveSchema = z.object({
  action: z.enum(['draft', 'submit']),
  version: z.number().int().min(1).optional(),
  plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
  reportDate: pastIsoDate(),
  values: dailyMisValuesSchema.default({} as never),
});
export type DailyMisSaveInput = z.infer<typeof dailyMisSaveSchema>;

/** Daily MIS table filters (BTN-P1): plant (one or all), date or date range, status. */
const dailyMisFilterShape = z.object({
  plantId: z.uuid().optional(),
  from: z
    .string()
    .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid)
    .optional(),
  to: z
    .string()
    .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid)
    .optional(),
  status: z.enum(REPORT_STATUSES).optional(),
});

function checkRange(
  v: { from?: string | undefined; to?: string | undefined },
  ctx: z.RefinementCtx,
): void {
  if (!v.from || !v.to) return;
  if (v.to < v.from) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: DAILY_MIS_MESSAGES.rangeOrder });
  } else if ((Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 > 366) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: DAILY_MIS_MESSAGES.rangeTooLong });
  }
}

export const dailyMisQuerySchema = dailyMisFilterShape
  .extend({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .superRefine(checkRange);
export type DailyMisQuery = z.infer<typeof dailyMisQuerySchema>;

/** Download (BTN-4, BEV-6): exactly the table's filter, plus the file type. */
export const dailyMisExportSchema = dailyMisFilterShape
  .extend({ format: z.enum(['xlsx', 'pdf']) })
  .superRefine(checkRange);
export type DailyMisExportQuery = z.infer<typeof dailyMisExportSchema>;
/** The filter part shared by the table and its download. */
export type DailyMisFilter = z.infer<typeof dailyMisFilterShape>;

/** Approval queue filter. */
export const approvalQueueQuerySchema = z.object({ plantId: z.uuid().optional() });

export const approveSchema = z.object({ version: z.number().int().min(1) });

/** Return: reason mandatory (UXV-8, APPR-3). */
export const returnSchema = z.object({
  version: z.number().int().min(1),
  reason: z
    .string({ error: DAILY_MIS_MESSAGES.returnReasonRequired })
    .trim()
    .min(1, DAILY_MIS_MESSAGES.returnReasonRequired)
    .max(1000, FIELD_MESSAGES.tooLong(1000)),
});

/** Reopen an Approved row: reason mandatory (APPR-5). */
export const reopenSchema = z.object({
  version: z.number().int().min(1),
  reason: z
    .string({ error: DAILY_MIS_MESSAGES.reopenReasonRequired })
    .trim()
    .min(1, DAILY_MIS_MESSAGES.reopenReasonRequired)
    .max(1000, FIELD_MESSAGES.tooLong(1000)),
});

/**
 * The system sums of a value set (DMIS-R5, D-13): the API stores exactly this, and the form shows
 * it as a live preview. Accepts what a form holds (text like “14,200”); unreadable entries count
 * as empty — the save itself rejects them with a field message.
 */
export function deriveDailyMis(
  values: Partial<Record<DailyMisValueKey, string | number | null>>,
): DailyMisDerived {
  const dec = (k: DailyMisValueKey): string | null => {
    const v = values[k];
    if (v === null || v === undefined) return null;
    const t = String(v).trim().replace(/,/g, '');
    return /^\d+$/.test(t) || /^\d+\.\d+$/.test(t) ? t : null;
  };
  const int = (k: DailyMisValueKey): number | null => {
    const v = values[k];
    if (typeof v === 'number') return Number.isInteger(v) ? v : null;
    if (typeof v !== 'string') return null;
    const t = v.trim().replace(/,/g, '');
    return /^\d+$/.test(t) ? Number(t) : null;
  };
  const safeDec = (k: DailyMisValueKey, scale: number): string | null => {
    const v = dec(k);
    if (v === null) return null;
    const [, frac = ''] = v.split('.');
    return frac.length > scale && /[1-9]/.test(frac.slice(scale)) ? null : v;
  };
  return computeDailyMisDerived({
    openingStock: safeDec('openingStock', 3),
    bulkReceipts: safeDec('bulkReceipts', 3),
    normalCylinderDespatch: safeDec('normalCylinderDespatch', 3),
    normalTtLoading: safeDec('normalTtLoading', 3),
    otCylinderDespatch: safeDec('otCylinderDespatch', 3),
    otTtLoading: safeDec('otTtLoading', 3),
    prcnReturn: safeDec('prcnReturn', 3),
    physicalStock: safeDec('physicalStock', 3),
    lossCarousel: int('lossCarousel'),
    lossEld: int('lossEld'),
    lossOld: int('lossOld'),
    lossConveyor: int('lossConveyor'),
    lossUpDownStream: int('lossUpDownStream'),
    lossUtility: int('lossUtility'),
    lossPowerEb: int('lossPowerEb'),
    lossMotorCable: int('lossMotorCable'),
    lossAutomation: int('lossAutomation'),
    lossFireDrill: int('lossFireDrill'),
    lossTraining: int('lossTraining'),
    lossManpower: int('lossManpower'),
    mrPinLeak: int('mrPinLeak'),
    mrPinCut: int('mrPinCut'),
    mrBodyLeak: int('mrBodyLeak'),
    mrBungLeak: int('mrBungLeak'),
    mrDptHr: int('mrDptHr'),
    mrWeight: int('mrWeight'),
    mrOther: int('mrOther'),
  });
}

/** Filling accuracy F39–F42: soft check only — the spec does not force 100 (D-14). */
export function accuracySumWarning(values: Partial<DailyMisValues>): string | null {
  const parts = ['accuracyZero', 'accuracy50', 'accuracy100', 'accuracyBeyond100'] as const;
  const present = parts
    .map((k) => values[k])
    .filter((v): v is string | number => v !== null && v !== undefined && v !== '');
  if (present.length < 4) return null;
  try {
    const total = sumDecimals(present, 2);
    return total === '100.00' ? null : `Filling accuracy 39–42 adds up to ${total} %, not 100 %.`;
  } catch {
    return null;
  }
}
