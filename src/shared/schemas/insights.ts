// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import {
  addDays,
  firstDayOfMonth,
  isFutureIstDate,
  isFutureIstMonth,
  isIsoDate,
  isIsoMonth,
  lastDayOfMonth,
  monthOf,
  type IsoDate,
  type IsoMonth,
} from '../ist';
import { FIELD_MESSAGES } from './field-values';
import { MONTHLY_MIS_MESSAGES } from './monthly-mis';

export const INSIGHT_MESSAGES = {
  dateOrMonth: 'Choose a date or a month, not both.',
  plantRequired: 'Select plant',
  rangeTooLong: 'Choose at most 31 days.',
  hoursRequired: 'Enter the hours per shift (1–24) before switching the formula on.',
  searchTooShort: 'Type at least 2 characters.',
} as const;

const pastDate = z
  .string()
  .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid)
  .refine((v) => !isIsoDate(v) || !isFutureIstDate(v), FIELD_MESSAGES.dateFuture)
  .optional();
const pastMonth = z
  .string()
  .refine((v) => isIsoMonth(v), MONTHLY_MIS_MESSAGES.monthInvalid)
  .refine((v) => !isIsoMonth(v) || !isFutureIstMonth(v), MONTHLY_MIS_MESSAGES.monthFuture)
  .optional();

function oneOf(v: { date?: string | undefined; month?: string | undefined }, ctx: z.RefinementCtx) {
  if (v.date && v.month)
    ctx.addIssue({ code: 'custom', path: ['month'], message: INSIGHT_MESSAGES.dateOrMonth });
}

// ───────────────────────────────────────────── Dashboard (DASH-*, BTN-D1…D4)

export const DASHBOARD_MODULES = [
  'ALL',
  'DAILY_MIS',
  'MONTHLY_MIS',
  'DAILY_EXCEPTIONS',
  'LICENCES',
  'AUDIT',
] as const;
export type DashboardModule = (typeof DASHBOARD_MODULES)[number];

export const DASHBOARD_MODULE_LABEL: Readonly<Record<DashboardModule, string>> = {
  ALL: 'All modules',
  DAILY_MIS: 'Daily MIS',
  MONTHLY_MIS: 'Monthly MIS',
  DAILY_EXCEPTIONS: 'Daily Exceptions',
  LICENCES: 'Licences',
  AUDIT: 'Audit',
};

/** Dashboard search: Module → Plant → Date or Month (each step after the previous one). */
export const dashboardQuerySchema = z
  .object({
    module: z.enum(DASHBOARD_MODULES).default('ALL'),
    plantId: z.uuid().optional(),
    date: pastDate,
    month: pastMonth,
  })
  .superRefine(oneOf);
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const dashboardExportSchema = dashboardQuerySchema.and(
  z.object({ format: z.enum(['xlsx', 'pdf']) }),
);

export const PERFORMANCE_RANGES = ['7D', '30D', '90D', '1Y'] as const;
export type PerformanceRange = (typeof PERFORMANCE_RANGES)[number];

export const performanceQuerySchema = z.object({
  range: z.enum(PERFORMANCE_RANGES).default('30D'),
  plantId: z.uuid().optional(),
});

// ───────────────────────────────────────────── Management Review (MR-*, BTN-P4)

/** Download layouts (MR-12, D-24): the standard one; more are added to this list later. */
export const REVIEW_LAYOUTS = ['standard'] as const;
export type ReviewLayout = (typeof REVIEW_LAYOUTS)[number];

export const reviewPackQuerySchema = z
  .object({ plantId: z.uuid().optional(), date: pastDate, month: pastMonth })
  .superRefine(oneOf);
export type ReviewPackQuery = z.infer<typeof reviewPackQuerySchema>;

export const reviewExportSchema = reviewPackQuerySchema.and(
  z.object({
    format: z.enum(['xlsx', 'pdf']),
    layout: z.enum(REVIEW_LAYOUTS).default('standard'),
  }),
);

export const COMPARISON_MODES = ['PLANTS', 'DATES'] as const;

/** Plant Comparison: the same date across plants, or several dates (≤ 31) on one plant. */
export const comparisonQuerySchema = z
  .object({
    mode: z.enum(COMPARISON_MODES).default('PLANTS'),
    date: pastDate,
    plantId: z.uuid().optional(),
    from: pastDate,
    to: pastDate,
  })
  .superRefine((v, ctx) => {
    if (v.mode !== 'DATES') return;
    if (!v.plantId)
      ctx.addIssue({ code: 'custom', path: ['plantId'], message: INSIGHT_MESSAGES.plantRequired });
    if (v.from && v.to && (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 > 30)
      ctx.addIssue({ code: 'custom', path: ['to'], message: INSIGHT_MESSAGES.rangeTooLong });
  });
export type ComparisonQuery = z.infer<typeof comparisonQuerySchema>;

// ───────────────────────────────────────────── Graphs (GR-0…GR-8, BTN-P9)

export const graphsQuerySchema = z.object({
  plantId: z.uuid({ error: INSIGHT_MESSAGES.plantRequired }),
  month: pastMonth,
});
export type GraphsQuery = z.infer<typeof graphsQuerySchema>;

export const graphsExportSchema = graphsQuerySchema.extend({ format: z.enum(['xlsx', 'pdf']) });

/** GR-4 switch: production ÷ (shifts × hours per shift), Off by default (Admin). */
export const manHourSettingSchema = z
  .object({
    enabled: z.boolean(),
    hoursPerShift: z.number().min(1).max(24).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.enabled && v.hoursPerShift === null)
      ctx.addIssue({
        code: 'custom',
        path: ['hoursPerShift'],
        message: INSIGHT_MESSAGES.hoursRequired,
      });
  });
export type ManHourSetting = z.infer<typeof manHourSettingSchema>;

// ───────────────────────────────────────────── Command palette

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, INSIGHT_MESSAGES.searchTooShort).max(60),
});

/** Status words shown in downloads and search results (the screens use the same pills). */
export const REPORT_STATUS_TEXT = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
} as const;

export const EXCEPTION_STATUS_TEXT = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  NOT_INITIATED: 'Not initiated',
} as const;

// ───────────────────────────────────────────── periods (pure; used by API and web)

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** `2026-10` → `Oct 2026` (chart axis). */
export function shortMonthLabel(month: IsoMonth): string {
  const [y, m] = month.split('-');
  return `${SHORT_MONTHS[Number(m) - 1] ?? ''} ${y ?? ''}`;
}

/** `2026-10-05` → `05-10` (chart axis; the table under it shows dd-mm-yyyy). */
export function shortDayLabel(date: IsoDate): string {
  return `${date.slice(8, 10)}-${date.slice(5, 7)}`;
}

export function addMonths(month: IsoMonth, n: number): IsoMonth {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + n;
  return `${String(Math.floor(idx / 12))}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** The `count` months ending with `month`, oldest first (Graphs trend window, D-125). */
export function monthsEnding(month: IsoMonth, count: number): IsoMonth[] {
  return Array.from({ length: count }, (_, i) => addMonths(month, i - count + 1));
}

/** Graphs trend charts cover the six months up to the chosen month. */
export const GRAPH_TREND_MONTHS = 6;

export interface PeriodBucket {
  label: string;
  from: IsoDate;
  to: IsoDate;
}

/**
 * Plant Performance buckets ending today (D-124): 7D and 30D one point per day, 90D one per
 * 7 days (13 points), 1Y one per calendar month (12 points, the first starting a year back).
 */
export function performanceBuckets(range: PerformanceRange, today: IsoDate): PeriodBucket[] {
  if (range === '7D' || range === '30D') {
    const n = range === '7D' ? 7 : 30;
    return Array.from({ length: n }, (_, i) => {
      const d = addDays(today, i - n + 1);
      return { label: shortDayLabel(d), from: d, to: d };
    });
  }
  if (range === '90D') {
    return Array.from({ length: 13 }, (_, i) => {
      const to = addDays(today, (i - 12) * 7);
      const from = addDays(to, -6);
      return { label: shortDayLabel(from), from, to };
    });
  }
  return monthsEnding(monthOf(today), 12).map((m) => {
    const last = lastDayOfMonth(m);
    return { label: shortMonthLabel(m), from: firstDayOfMonth(m), to: last < today ? last : today };
  });
}

/** Breakdown minutes on Management Review (MR-4, D-126) = mechanical + electrical loss totals. */
export function breakdownMinutes(
  mechanical: number | null,
  electrical: number | null,
): number | null {
  if (mechanical === null && electrical === null) return null;
  return (mechanical ?? 0) + (electrical ?? 0);
}
