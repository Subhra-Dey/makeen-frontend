// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import type { ExceptionStatus, PlantOperatingStatus, YesNo } from '../enums';
import {
  DAILY_EXCEPTION_LINES,
  type ExceptionDetailDef,
  type ExceptionLineDef,
} from '../fields/daily-exception';

export type ExceptionDetailValue = string | number | null;

/** One answered (or not yet answered) line: Yes / No and the extra fields a Yes opens. */
export interface ExceptionLineValue {
  answer: YesNo | null;
  details: Record<string, ExceptionDetailValue>;
}

/** Lines 1–13 keyed by line number as text ('1' … '13'). */
export type ExceptionLines = Record<string, ExceptionLineValue>;

const LINES = DAILY_EXCEPTION_LINES as readonly ExceptionLineDef[];

/** Problem highlight column width (VARCHAR 500). */
export const HIGHLIGHT_MAX = 500;

const blank = (v: unknown): boolean => v === null || v === undefined || v === '';

/** Number of tanks chosen on line 4 (1–3), or null. */
function tankCount(details: Record<string, ExceptionDetailValue>): number | null {
  const n = Number(details['tankCount']);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : null;
}

/** Is this extra field shown (and so required on Submit) for these details? */
export function detailApplies(
  def: ExceptionDetailDef,
  details: Record<string, ExceptionDetailValue>,
): boolean {
  if (def.minTanks === undefined) return true;
  return (tankCount(details) ?? 1) >= def.minTanks;
}

/**
 * Normalise lines for storage (DEX-R6): every line 1–13 present; a line that is not Yes keeps no
 * extra fields; a Yes line keeps only the fields it shows (tank levels follow the tank count).
 */
export function cleanLines(
  lines: Partial<ExceptionLines>,
  defs: readonly ExceptionLineDef[] = LINES,
): ExceptionLines {
  const out: ExceptionLines = {};
  for (const def of defs) {
    const line = lines[String(def.lineNo)];
    const answer = line?.answer ?? null;
    const details: Record<string, ExceptionDetailValue> = {};
    if (answer === 'YES' && line) {
      for (const d of def.details) {
        const v = line.details[d.key];
        if (!blank(v) && detailApplies(d, line.details)) details[d.key] = v ?? null;
      }
    }
    out[String(def.lineNo)] = { answer, details };
  }
  return out;
}

export function allAnswered(
  lines: ExceptionLines,
  defs: readonly ExceptionLineDef[] = LINES,
): boolean {
  return defs.every((d) => (lines[String(d.lineNo)]?.answer ?? null) !== null);
}

/**
 * Report status (DEX-S1…S3, D-20):
 *   Save draft                                   → Partial
 *   Submit, every line No, Operational           → Completed
 *   Submit, any Yes or an incident               → Pending
 *   Submit, every line No but Non-operational    → Pending (D-20)
 */
export function exceptionStatus(
  action: 'draft' | 'submit',
  plantStatus: PlantOperatingStatus | null,
  lines: ExceptionLines,
  defs: readonly ExceptionLineDef[] = LINES,
): ExceptionStatus {
  if (action === 'draft') return 'PARTIAL';
  const anyYes = defs.some((d) => lines[String(d.lineNo)]?.answer === 'YES');
  return anyYes || plantStatus !== 'OPERATIONAL' ? 'PENDING' : 'COMPLETED';
}

function shown(def: ExceptionDetailDef, v: ExceptionDetailValue): string {
  const text = String(v);
  if (def.kind === 'select' && def.options?.includes(text) && /^[A-Z_]+$/.test(text))
    return text.charAt(0) + text.slice(1).toLowerCase();
  return def.unit && def.kind !== 'text' ? `${text} ${def.unit}` : text;
}

const cut = (s: string): string =>
  s.length <= HIGHLIGHT_MAX ? s : `${s.slice(0, HIGHLIGHT_MAX - 1)}…`;

/** One problem taken from a filled form. */
export interface FormException {
  /** Form field that raised it. `plant_status` when the plant is non-operational. */
  readonly fieldKey: string;
  readonly lineNo: number;
  readonly summary: string;
}

function lineSummary(def: ExceptionLineDef, line: ExceptionLines[string]): string {
  const remark = line.details['remarks'];
  if (def.incident) return cut(`Incident: ${blank(remark) ? '—' : String(remark)}`);
  if (!blank(remark)) return cut(String(remark));
  const textDef = def.details.find((d) => d.kind === 'text');
  const text = textDef ? line.details[textDef.key] : null;
  if (!blank(text)) return cut(`Line ${String(def.lineNo)} — ${String(text)}`);
  const parts = def.details
    .filter((d) => !blank(line.details[d.key]))
    .map((d) => `${d.label}: ${shown(d, line.details[d.key] ?? null)}`);
  return cut(`Line ${String(def.lineNo)} — ${parts.length > 0 ? parts.join('; ') : def.question}`);
}

/**
 * Exceptions produced by a submitted form. Each Yes check is one exception. A non-operational
 * plant with no Yes check is one exception. A draft or a clean day produces none.
 */
export function formExceptions(
  status: ExceptionStatus,
  plantStatus: PlantOperatingStatus | null,
  lines: ExceptionLines,
  defs: readonly ExceptionLineDef[] = LINES,
): FormException[] {
  if (status !== 'PENDING') return [];
  const found: FormException[] = [];
  for (const def of defs) {
    const line = lines[String(def.lineNo)];
    if (line?.answer !== 'YES') continue;
    found.push({ fieldKey: `l${String(def.lineNo)}`, lineNo: def.lineNo, summary: lineSummary(def, line) });
  }
  if (found.length === 0 && plantStatus === 'NON_OPERATIONAL') {
    found.push({ fieldKey: 'plant_status', lineNo: 0, summary: 'Plant non-operational' });
  }
  return found;
}

/**
 * Problem highlight (DEX-R4, D-22): the first exception the form produced. Null when the day is
 * clean or the report is still a draft.
 */
export function problemHighlight(
  status: ExceptionStatus,
  plantStatus: PlantOperatingStatus | null,
  lines: ExceptionLines,
  defs: readonly ExceptionLineDef[] = LINES,
): string | null {
  return formExceptions(status, plantStatus, lines, defs)[0]?.summary ?? null;
}
