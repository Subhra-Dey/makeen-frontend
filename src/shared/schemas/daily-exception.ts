// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { EXCEPTION_STATUSES, PLANT_OPERATING_STATUSES, YES_NO } from '../enums';
import {
  DAILY_EXCEPTION_LINES,
  type ExceptionDetailDef,
  type ExceptionLineDef,
} from '../fields/daily-exception';
import { isIsoDate } from '../ist';
import { detailApplies } from '../rules/daily-exception';
import { DAILY_MIS_MESSAGES } from './daily-mis';
import {
  FIELD_MESSAGES,
  decimalValue,
  intValue,
  pastIsoDate,
  selectValue,
  textValue,
} from './field-values';

export const DAILY_EXCEPTION_MESSAGES = {
  plantStatusRequired: 'Choose the plant status.',
  answerRequired: 'Answer Yes or No.',
  remarksRequired: 'Enter remarks — required when the answer is Yes.',
  incidentRequired: 'Describe the incident — required when there is an incident.',
  detailRequired: 'Required when the answer is Yes.',
  allLinesRequired: 'Answer all 13 lines before you submit.',
  alreadyExists: 'A Daily Exception for this plant and date already exists. Open it instead.',
  stale: 'Someone else saved this Daily Exception. Reload it and try again.',
  plantDateFixed: 'Plant and date cannot change after the report is submitted.',
  notFound: 'Daily Exception not found.',
  fileType: 'Upload a PDF, JPG, PNG or XLSX file of at most 10 MB.',
  fileRequired: 'Choose a file to upload.',
  fileNotFound: 'File not found.',
  noteRequired: 'Type a short note (at most 300 characters).',
  noteNotMissed: 'A note can only explain a day with no Daily Exception.',
} as const;

/** Text detail fields (remarks, observation): at most 500 characters (the highlight width). */
export const EXCEPTION_TEXT_MAX = 500;

const SEEDED_LINES = DAILY_EXCEPTION_LINES as readonly ExceptionLineDef[];

function detailSchema(def: ExceptionDetailDef) {
  switch (def.kind) {
    case 'text':
      return textValue(EXCEPTION_TEXT_MAX);
    case 'count':
      return intValue();
    case 'decimal':
      return decimalValue('units', def.decimals ?? 2);
    case 'select':
      return selectValue(def.options ?? []);
  }
}

/** Per-line schema (DEX-R7): the answer and only that line's extra fields (others dropped). */
export function exceptionLineSchema(def: ExceptionLineDef) {
  const shape = Object.fromEntries(def.details.map((d) => [d.key, detailSchema(d)]));
  return z.object({
    answer: selectValue(YES_NO).transform((v) => (v === null ? null : (v as 'YES' | 'NO'))),
    details: z.object(shape).default({}),
  });
}

/** Save rules for one checklist. The live API builds this from `exception_questions`. */
export function exceptionSaveSchema(defs: readonly ExceptionLineDef[]) {
  const linesShape = Object.fromEntries(
    defs.map((def) => [
      String(def.lineNo),
      exceptionLineSchema(def).default({ answer: null, details: {} }),
    ]),
  );
  return z
    .object({
      action: z.enum(['draft', 'submit']),
      version: z.number().int().min(1).optional(),
      plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
      reportDate: pastIsoDate(),
      plantStatus: z.enum(PLANT_OPERATING_STATUSES).nullable().optional(),
      lines: z.object(linesShape).default({} as never),
    })
    .superRefine((v, ctx) => {
      if (v.action !== 'submit') return;
      if (!v.plantStatus) {
        ctx.addIssue({
          code: 'custom',
          path: ['plantStatus'],
          message: DAILY_EXCEPTION_MESSAGES.plantStatusRequired,
        });
      }
      for (const def of defs) {
        const key = String(def.lineNo);
        const line = v.lines[key];
        if (!line?.answer) {
          ctx.addIssue({
            code: 'custom',
            path: ['lines', key, 'answer'],
            message: DAILY_EXCEPTION_MESSAGES.answerRequired,
          });
          continue;
        }
        if (line.answer !== 'YES') continue;
        for (const d of def.details) {
          if (!detailApplies(d, line.details)) continue;
          const val = line.details[d.key];
          if (val !== null && val !== undefined && val !== '') continue;
          ctx.addIssue({
            code: 'custom',
            path: ['lines', key, 'details', d.key],
            message: def.incident
              ? DAILY_EXCEPTION_MESSAGES.incidentRequired
              : d.key === 'remarks'
                ? DAILY_EXCEPTION_MESSAGES.remarksRequired
                : DAILY_EXCEPTION_MESSAGES.detailRequired,
          });
        }
      }
    });
}

/** The seeded checklist. Tests use this. The running form uses the database rows. */
export const dailyExceptionSaveSchema = exceptionSaveSchema(SEEDED_LINES);
export type DailyExceptionSaveInput = z.infer<typeof dailyExceptionSaveSchema>;

/** Request body before the checklist in the database is applied. */
export const dailyExceptionBodySchema = z.object({
  action: z.enum(['draft', 'submit']),
  version: z.number().int().min(1).optional(),
  plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
  reportDate: pastIsoDate(),
  plantStatus: z.enum(PLANT_OPERATING_STATUSES).nullable().optional(),
  lines: z
    .record(
      z.string(),
      z.object({
        answer: z.enum(YES_NO).nullable().optional(),
        details: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
      }),
    )
    .default({}),
});
export type DailyExceptionBody = z.infer<typeof dailyExceptionBodySchema>;

/** Table status filter: the stored statuses plus the derived Not initiated (DEX-S4). */
export const EXCEPTION_ROW_STATUSES = [...EXCEPTION_STATUSES, 'NOT_INITIATED'] as const;
export type ExceptionRowStatus = (typeof EXCEPTION_ROW_STATUSES)[number];

const isoDate = z
  .string()
  .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid)
  .optional();

const exceptionFilterShape = z.object({
  plantId: z.uuid().optional(),
  from: isoDate,
  to: isoDate,
  status: z.enum(EXCEPTION_ROW_STATUSES).optional(),
});
export type DailyExceptionFilter = z.infer<typeof exceptionFilterShape>;

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

/** Daily Exceptions table filters (BTN-P3): plant, date or date range, status. */
export const dailyExceptionQuerySchema = exceptionFilterShape
  .extend({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .superRefine(checkRange);
export type DailyExceptionQuery = z.infer<typeof dailyExceptionQuerySchema>;

export const dailyExceptionExportSchema = exceptionFilterShape
  .extend({ format: z.enum(['xlsx', 'pdf']) })
  .superRefine(checkRange);

/** Optional short plant note explaining a missed day (DEX-S7). */
export const lapseNoteSchema = z.object({
  plantId: z.uuid({ error: FIELD_MESSAGES.plantRequired }),
  date: pastIsoDate(),
  note: z
    .string({ error: DAILY_EXCEPTION_MESSAGES.noteRequired })
    .trim()
    .min(1, DAILY_EXCEPTION_MESSAGES.noteRequired)
    .max(300, DAILY_EXCEPTION_MESSAGES.noteRequired),
});
export type LapseNoteInput = z.infer<typeof lapseNoteSchema>;
