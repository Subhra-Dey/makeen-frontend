// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { z } from 'zod';
import { emailSchema } from './auth';

/**
 * KEKA loader columns (spec People › Load, PPL-2). The CSV / Excel file and the KEKA API adapter
 * use the same columns. Headers are matched case-insensitively, ignoring spaces and punctuation.
 */
export const KEKA_COLUMNS = [
  { key: 'name', header: 'Employee name', aliases: ['employeename', 'name', 'fullname'] },
  { key: 'employeeCode', header: 'Employee code', aliases: ['employeecode', 'code', 'empcode'] },
  { key: 'email', header: 'Email', aliases: ['email', 'emailid', 'workemail'] },
  { key: 'phone', header: 'Phone', aliases: ['phone', 'phonenumber', 'mobile', 'mobilenumber'] },
  { key: 'aadhaar', header: 'Aadhaar', aliases: ['aadhaar', 'aadhaarno', 'aadhaarnumber'] },
  { key: 'designation', header: 'Designation', aliases: ['designation', 'jobtitle'] },
  {
    key: 'workingStatus',
    header: 'Working / Resigned',
    aliases: ['workingresigned', 'workingstatus', 'status'],
  },
] as const;
export type KekaColumnKey = (typeof KEKA_COLUMNS)[number]['key'];
export type KekaRawRow = Partial<Record<KekaColumnKey, string>>;

/** Column key for a header cell, or null when the column is not one of ours (ignored). */
export function kekaColumnFor(header: string): KekaColumnKey | null {
  const norm = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const c of KEKA_COLUMNS) {
    if ((c.aliases as readonly string[]).includes(norm)) return c.key;
  }
  return null;
}

export const KEKA_MESSAGES = {
  nameRequired: 'Employee name is missing.',
  codeRequired: 'Employee code is missing.',
  codeInvalid: 'Employee code may use letters, digits, “-”, “_” and “/” only (max 32).',
  emailNotMakeen: 'Email is not a MAKEEN address.',
  phoneInvalid: 'Phone must be a 10-digit Indian mobile number.',
  aadhaarInvalid: 'Aadhaar must be a valid 12-digit number.',
  designationRequired: 'Designation is missing.',
  statusInvalid: 'Working / Resigned must be “Working” or “Resigned”.',
  duplicateCode: 'This employee code appears more than once in the file.',
  duplicateEmail: 'This email appears more than once in the file.',
  emailTaken: 'This email already belongs to another employee code.',
} as const;

// Verhoeff tables (UIDAI uses the Verhoeff checksum for the 12th Aadhaar digit).
const VD: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VP: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const VINV: readonly number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/** Digits only (callers check with a regex first); walks from the rightmost digit. */
function verhoeffStep(digits: string, offset: number): number {
  let c = 0;
  for (let i = 0; i < digits.length; i += 1) {
    const d = digits.charCodeAt(digits.length - 1 - i) - 48;
    const p = VP[(i + offset) % 8] ?? [];
    c = VD[c]?.[p[d] ?? 0] ?? 0;
  }
  return c;
}

/** Verhoeff check digit for a digit string (without its check digit). */
export function verhoeffCheckDigit(digits: string): number {
  return VINV[verhoeffStep(digits, 1)] ?? 0;
}

/** 12 digits, first digit 2–9, valid Verhoeff checksum (UIDAI format). */
export function isValidAadhaar(digits: string): boolean {
  return /^[2-9]\d{11}$/.test(digits) && verhoeffStep(digits, 0) === 0;
}

/** Normalise an Indian mobile: drops spaces/dashes, +91 / 91 / 0 prefixes. Null when invalid. */
export function normaliseIndianMobile(value: string): string | null {
  let d = value.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

const blankToUndefined = (v: unknown): unknown =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

/** One KEKA row after validation (values normalised; Aadhaar still plain — encrypt at once). */
export const kekaRowSchema = z.object({
  name: z
    .string({ error: KEKA_MESSAGES.nameRequired })
    .trim()
    .min(1, KEKA_MESSAGES.nameRequired)
    .max(160),
  employeeCode: z
    .string({ error: KEKA_MESSAGES.codeRequired })
    .trim()
    .min(1, KEKA_MESSAGES.codeRequired)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_/-]{0,31}$/, KEKA_MESSAGES.codeInvalid)
    .transform((v) => v.toUpperCase()),
  email: emailSchema,
  phone: z.preprocess(
    blankToUndefined,
    z
      .string()
      .transform((v, ctx) => {
        const n = normaliseIndianMobile(v);
        if (n === null) {
          ctx.addIssue({ code: 'custom', message: KEKA_MESSAGES.phoneInvalid });
          return z.NEVER;
        }
        return n;
      })
      .optional(),
  ),
  aadhaar: z.preprocess(
    blankToUndefined,
    z
      .string()
      .transform((v, ctx) => {
        const d = v.replace(/[\s-]/g, '');
        if (!isValidAadhaar(d)) {
          ctx.addIssue({ code: 'custom', message: KEKA_MESSAGES.aadhaarInvalid });
          return z.NEVER;
        }
        return d;
      })
      .optional(),
  ),
  designation: z
    .string({ error: KEKA_MESSAGES.designationRequired })
    .trim()
    .min(1, KEKA_MESSAGES.designationRequired)
    .max(120)
    .transform((v) => v.replace(/\s+/g, ' ')),
  workingStatus: z
    .string({ error: KEKA_MESSAGES.statusInvalid })
    .trim()
    .transform((v, ctx) => {
      const s = v.toLowerCase();
      if (s === 'working') return 'WORKING' as const;
      if (s === 'resigned') return 'RESIGNED' as const;
      ctx.addIssue({ code: 'custom', message: KEKA_MESSAGES.statusInvalid });
      return z.NEVER;
    }),
});
export type KekaRow = z.infer<typeof kekaRowSchema>;

/** What the loader did (or would do, on a dry run) with each row. */
export const IMPORT_OUTCOMES = ['CREATE', 'UPDATE', 'UNCHANGED', 'ERROR'] as const;
export type ImportOutcome = (typeof IMPORT_OUTCOMES)[number];
