// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

/**
 * Daily Exception — the 13-point safety check (spec “Daily Exception — form”, fields 1–48).
 * A Yes opens the line's extra fields and makes them required; a No hides them.
 * The per-line server-side Zod schemas (Phase 8) are generated from these definitions.
 */

export type ExceptionDetailKind = 'text' | 'count' | 'decimal' | 'select';

export interface ExceptionDetailDef {
  /** Spec field number. */
  readonly no: number;
  readonly key: string;
  readonly label: string;
  readonly kind: ExceptionDetailKind;
  readonly unit?: string;
  readonly placeholder?: string;
  readonly options?: readonly string[];
  /** Decimals for 'decimal' fields. */
  readonly decimals?: number;
  /**
   * Shown/required only when the line's `tankCount` is at least this (line 4 tank levels).
   */
  readonly minTanks?: number;
}

export interface ExceptionLineDef {
  readonly lineNo: number;
  /** Spec field number of the Yes / No answer. */
  readonly answerNo: number;
  readonly question: string;
  /** Extra fields opened (and required) by Yes. */
  readonly details: readonly ExceptionDetailDef[];
  /** True when the line is the incident line (Yes = incident, remarks mandatory). */
  readonly incident?: boolean;
}

const remarks = (no: number, placeholder = 'Enter remarks'): ExceptionDetailDef => ({
  no,
  key: 'remarks',
  label: 'Remarks',
  kind: 'text',
  placeholder,
});
const count = (no: number, key: string, label: string): ExceptionDetailDef => ({
  no,
  key,
  label,
  kind: 'count',
  placeholder: '0',
});
const metres = (no: number, key: string, label: string, minTanks?: number): ExceptionDetailDef => ({
  no,
  key,
  label,
  kind: 'decimal',
  unit: 'm',
  decimals: 2,
  placeholder: '0.00',
  ...(minTanks === undefined ? {} : { minTanks }),
});
const kilolitres = (no: number, key: string, label: string): ExceptionDetailDef => ({
  no,
  key,
  label,
  kind: 'decimal',
  unit: 'KL',
  decimals: 2,
  placeholder: '0.00',
});

export const JOCKEY_PUMP_MODES = ['MANUAL', 'AUTO'] as const;
export const TANK_COUNTS = ['1', '2', '3'] as const;
export const SQC_CYLINDER_TYPES = ['5', '10', '14.2', '19', '35', '47.5'] as const;

export const DAILY_EXCEPTION_LINES = [
  {
    lineNo: 1,
    answerNo: 5,
    question: 'All fire engines / fire pumps are in working condition',
    details: [remarks(6)],
  },
  { lineNo: 2, answerNo: 7, question: 'Fire fighting system in auto mode', details: [remarks(8)] },
  {
    lineNo: 3,
    answerNo: 9,
    question: 'Both the jockey pumps are in working condition',
    details: [
      {
        no: 10,
        key: 'jockeyPump1',
        label: 'Jockey pump no. 1',
        kind: 'select',
        options: JOCKEY_PUMP_MODES,
      },
      {
        no: 11,
        key: 'jockeyPump2',
        label: 'Jockey pump no. 2',
        kind: 'select',
        options: JOCKEY_PUMP_MODES,
      },
      count(12, 'jockeyRuns24h', 'Total runs of jockey pump in last 24 hours'),
    ],
  },
  {
    lineNo: 4,
    answerNo: 13,
    question: 'Firewater tanks are full with water (required quantity)',
    details: [
      {
        no: 14,
        key: 'tankCount',
        label: 'Total number of tanks',
        kind: 'select',
        options: TANK_COUNTS,
      },
      kilolitres(15, 'tankCapacityKl', 'Capacity of each tank'),
      metres(16, 'tankHeightM', 'Height of each tank'),
      metres(17, 'tankDiameterM', 'Diameter of each tank'),
      metres(18, 'tank1LevelM', 'Tank 1 level', 1),
      metres(19, 'tank2LevelM', 'Tank 2 level', 2),
      metres(20, 'tank3LevelM', 'Tank 3 level', 3),
      kilolitres(21, 'min4hRequirementKl', 'Min. 4 hours requirement'),
      kilolitres(22, 'pumpableWaterKl', 'Total pumpable water available'),
    ],
  },
  {
    lineNo: 5,
    answerNo: 23,
    question:
      'All safety ROVs (remotely operated valves) are working in auto mode — bullet ROVs, TLD main ROVs and carousel ROVs',
    details: [
      count(24, 'rovTotal', 'Total no. of safety ROVs'),
      count(25, 'rovGood', 'Total no. of safety ROVs in good working condition'),
    ],
  },
  {
    lineNo: 6,
    answerNo: 26,
    question: 'MCP / ESD / BGU / DV buttons / HLA and other trippings are in working condition',
    details: [remarks(27)],
  },
  {
    lineNo: 7,
    answerNo: 28,
    question: 'All DVs are in working condition',
    details: [
      count(29, 'dvTotal', 'Total no. of DVs'),
      count(30, 'zoneTotal', 'Total no. of zones'),
    ],
  },
  {
    lineNo: 8,
    answerNo: 31,
    question: 'Vapour extraction system is in working condition',
    details: [remarks(32)],
  },
  {
    lineNo: 9,
    answerNo: 33,
    question: 'Gas monitoring / fire or smoke detection in working condition',
    details: [
      count(34, 'gasDetectors', 'Total no. of gas detectors'),
      count(35, 'smokeDetectors', 'Total no. of smoke detectors'),
      count(36, 'alarms24h', 'Number of alarms in last 24 hours'),
    ],
  },
  {
    lineNo: 10,
    answerNo: 37,
    question: 'GD / PT are in working condition',
    details: [remarks(38)],
  },
  {
    lineNo: 11,
    answerNo: 39,
    question: 'Any deviation in the daily SQC report done by DSO',
    details: [
      {
        no: 40,
        key: 'cylinderType',
        label: 'Type of cylinder',
        kind: 'select',
        unit: 'kg',
        options: SQC_CYLINDER_TYPES,
      },
      {
        no: 41,
        key: 'sqcAverageResult',
        label: 'Average result for SQC report',
        kind: 'decimal',
        unit: 'gms / cylinder',
        decimals: 2,
        placeholder: '0.00',
      },
    ],
  },
  {
    lineNo: 12,
    answerNo: 42,
    question: 'All the CCTV are in working condition',
    details: [
      count(43, 'cameraTotal', 'Total no. of cameras'),
      {
        no: 44,
        key: 'dsoObservation',
        label: 'Observation recorded during monitoring by DSO',
        kind: 'text',
        placeholder: 'Enter observation',
      },
    ],
  },
  {
    lineNo: 13,
    answerNo: 45,
    question: 'Any incident occurred',
    incident: true,
    details: [remarks(46, 'Describe the incident')],
  },
] as const satisfies readonly ExceptionLineDef[];

export const DAILY_EXCEPTION_LINE_COUNT = 13;
