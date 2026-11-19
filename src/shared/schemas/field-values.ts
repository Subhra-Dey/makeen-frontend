// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { fromScaled, toScaled } from '../decimal';
import type { FieldDef, FieldKind } from '../fields/types';
import { isFutureIstDate, isIsoDate } from '../ist';

/** Messages shown under a field (spec “UX validations”). */
export const FIELD_MESSAGES = {
  number: 'Enter a number.',
  whole: 'Enter a whole number.',
  negative: 'Cannot be negative.',
  tooLarge: 'This number is too large.',
  atMost: (n: number): string => `Enter at most ${n}.`,
  decimals: (n: number): string => `Use at most ${n} decimal${n === 1 ? '' : 's'}.`,
  percent: 'Enter a percentage from 0 to 100.',
  time: 'Use hh:mm (24-hour clock).',
  tooLong: (n: number): string => `Use at most ${n} characters.`,
  option: 'Choose one of the options.',
  plantRequired: 'Select plant',
  dateRequired: 'Enter the date (dd-mm-yyyy).',
  dateInvalid: 'Enter a real date (dd-mm-yyyy).',
  dateFuture: 'The date cannot be in the future (India time).',
} as const;

/** Largest value per decimal kind (the column's integer digits) — D-14 ranges. */
const MAX_WHOLE: Partial<Record<FieldKind, bigint>> = {
  mt: 99_999_999_999n, // Decimal(14,3)
  hours: 9_999n, // Decimal(6,2)
  rupees: 999_999_999_999n, // Decimal(14,2)
  litres: 999_999_999_999n,
  units: 999_999_999_999n,
  ratio: 9n, // Decimal(4,3)
  percent: 100n,
};
const MAX_INT = 2_000_000_000;

/**
 * One decimal value as a canonical string with exactly `decimals` places (“0.000”), or null.
 * Accepts strings (the form) and numbers; refuses negatives, extra decimals and overflow.
 */
export function decimalValue(kind: FieldKind, decimals: number, maxValue?: number) {
  return z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((raw, ctx): string | null => {
      if (raw === null || raw === undefined) return null;
      const text = typeof raw === 'number' ? String(raw) : raw.trim().replace(/,/g, '');
      if (text === '') return null;
      let scaled: bigint | null;
      try {
        scaled = toScaled(text, decimals);
      } catch (e: unknown) {
        const tooMany = e instanceof RangeError && e.message.startsWith('Too many');
        ctx.addIssue({
          code: 'custom',
          message: tooMany ? FIELD_MESSAGES.decimals(decimals) : FIELD_MESSAGES.number,
        });
        return z.NEVER;
      }
      if (scaled === null) return null;
      if (scaled < 0n) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.negative });
        return z.NEVER;
      }
      const max = maxValue !== undefined ? BigInt(maxValue) : MAX_WHOLE[kind];
      if (max !== undefined && scaled > max * 10n ** BigInt(decimals)) {
        ctx.addIssue({
          code: 'custom',
          message:
            kind === 'percent'
              ? FIELD_MESSAGES.percent
              : maxValue !== undefined
                ? FIELD_MESSAGES.atMost(maxValue)
                : FIELD_MESSAGES.tooLarge,
        });
        return z.NEVER;
      }
      return fromScaled(scaled, decimals);
    });
}

/** A non-negative whole number (counts, minutes), or null. Accepts “14,200”. */
export function intValue() {
  return z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((raw, ctx): number | null => {
      if (raw === null || raw === undefined) return null;
      const text = typeof raw === 'number' ? String(raw) : raw.trim().replace(/,/g, '');
      if (text === '') return null;
      if (!/^-?\d+$/.test(text)) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.whole });
        return z.NEVER;
      }
      const n = Number(text);
      if (n < 0) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.negative });
        return z.NEVER;
      }
      if (n > MAX_INT) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.tooLarge });
        return z.NEVER;
      }
      return n;
    });
}

export function textValue(maxLength: number) {
  return z
    .string()
    .nullable()
    .optional()
    .transform((raw, ctx): string | null => {
      if (raw === null || raw === undefined) return null;
      const t = raw.trim();
      if (t === '') return null;
      if (t.length > maxLength) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.tooLong(maxLength) });
        return z.NEVER;
      }
      return t;
    });
}

function timeValue() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((raw, ctx): string | null => {
      if (raw === null || raw === undefined || raw.trim() === '') return null;
      const t = raw.trim();
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.time });
        return z.NEVER;
      }
      return t;
    });
}

export function selectValue(options: readonly string[]) {
  return z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((raw, ctx): string | null => {
      if (raw === null || raw === undefined || raw === '') return null;
      const v = String(raw);
      if (!options.includes(v)) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.option });
        return z.NEVER;
      }
      return v;
    });
}

/** An optional business date in ISO form, never in the future (e.g. Monthly 62, 64). */
function optionalPastDate() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((raw, ctx): string | null => {
      if (raw === null || raw === undefined || raw.trim() === '') return null;
      const t = raw.trim();
      if (!isIsoDate(t)) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.dateInvalid });
        return z.NEVER;
      }
      if (isFutureIstDate(t)) {
        ctx.addIssue({ code: 'custom', message: FIELD_MESSAGES.dateFuture });
        return z.NEVER;
      }
      return t;
    });
}

/** The Zod rule for one typed field (all optional: a Draft may be incomplete). */
export function valueSchemaFor(def: FieldDef) {
  switch (def.kind) {
    case 'mt':
    case 'percent':
    case 'hours':
    case 'rupees':
    case 'litres':
    case 'units':
    case 'ratio':
      return decimalValue(def.kind, def.decimals, def.maxValue);
    case 'count':
    case 'minutes':
      return intValue();
    case 'time':
      return timeValue();
    case 'select':
      return selectValue(def.options ?? []);
    case 'text':
      return textValue(def.maxLength ?? 1000);
    case 'yesno':
      return selectValue(['YES', 'NO']);
    case 'date':
      return optionalPastDate();
    case 'plant':
    case 'month':
    case 'shown':
      throw new RangeError(`${def.key} is not a typed value field`);
  }
}

/** Calendar date in ISO form, never a future India date (UXV-7). */
export function pastIsoDate(required = FIELD_MESSAGES.dateRequired) {
  return z
    .string({ error: required })
    .trim()
    .min(1, required)
    .refine((v) => isIsoDate(v), FIELD_MESSAGES.dateInvalid)
    .refine((v) => !isIsoDate(v) || !isFutureIstDate(v), FIELD_MESSAGES.dateFuture);
}
