// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { field, type FieldDef } from './types';

/** Daily MIS form sections (spec “Daily MIS — form”). */
export const DAILY_MIS_SECTIONS = {
  header: 'Header',
  stock: 'Stock, receipt, despatch, filling',
  mechanical: 'Production time loss — Mechanical',
  electrical: 'Production time loss — Electrical & indent',
  misc: 'Production time loss — Miscellaneous',
  accuracy: 'Indents & filling accuracy',
  marketReturn: 'Market return',
  sqc: 'SQC (quality check)',
  notes: 'Notes',
} as const;

const S = DAILY_MIS_SECTIONS;
const MT = { unit: 'MT' } as const;
const MIN = { unit: 'min' } as const;
const PCT = { unit: '%' } as const;

/** The 60 numbered Daily MIS fields, defined once (spec field numbers). */
export const DAILY_MIS_FIELDS = [
  field(1, 'plantId', 'Plant name', S.header, 'plant', { required: true }),
  field(2, 'reportDate', 'Date', S.header, 'date', { required: true }),
  field(3, 'monthYear', 'Month and year', S.header, 'shown', { readOnly: true }),
  field(4, 'updatedAt', 'Last updated on', S.header, 'shown', { readOnly: true }),
  field(5, 'shiftsOperated', 'No. of shifts operated', S.header, 'select', {
    options: ['0', '1', '2', '3'],
  }),
  field(6, 'otHours', 'No. of OT hours', S.header, 'hours', { unit: 'h', maxValue: 24 }),
  field(7, 'enteredBy', 'Entered by', S.header, 'shown', { readOnly: true }),
  field(8, 'status', 'Status', S.header, 'shown', { readOnly: true }),

  field(9, 'openingStock', 'Opening stock', S.stock, 'mt', MT),
  field(10, 'bulkReceipts', 'Bulk receipts PLT / tanker', S.stock, 'mt', MT),
  field(11, 'normalCylinderDespatch', 'Normal production — Cylinder despatches', S.stock, 'mt', MT),
  field(12, 'normalTtLoading', 'Normal production — TT loading', S.stock, 'mt', MT),
  field(13, 'otCylinderDespatch', 'Over-time production — Cylinder despatches', S.stock, 'mt', MT),
  field(14, 'otTtLoading', 'Over-time production — TT loading', S.stock, 'mt', MT),
  field(15, 'cylFilled142', 'No. of cylinders filled — 14.2 kg', S.stock, 'count', {
    unit: 'count',
  }),
  field(16, 'cylFilled19', 'No. of cylinders filled — 19 kg', S.stock, 'count', { unit: 'count' }),
  field(17, 'prcnReturn', 'PRCN return', S.stock, 'mt', MT),
  field(18, 'closingBookStock', 'Closing book stock', S.stock, 'mt', {
    ...MT,
    readOnly: true,
    formula: '9 + 10 − (11 + 12 + 13 + 14) + 17',
  }),
  field(19, 'physicalStock', 'Physical stock', S.stock, 'mt', MT),
  field(20, 'stockGainLoss', 'Stock gain / loss', S.stock, 'mt', {
    ...MT,
    readOnly: true,
    formula: '19 − 18',
  }),

  field(21, 'lossCarousel', 'Mechanical — Carousel', S.mechanical, 'minutes', MIN),
  field(22, 'lossEld', 'Mechanical — ELD (filling-machine check)', S.mechanical, 'minutes', MIN),
  field(
    23,
    'lossOld',
    'Mechanical — OLD (other filling-machine check)',
    S.mechanical,
    'minutes',
    MIN,
  ),
  field(24, 'lossConveyor', 'Mechanical — Conveyor', S.mechanical, 'minutes', MIN),
  field(
    25,
    'lossUpDownStream',
    'Mechanical — Up / down stream equipment',
    S.mechanical,
    'minutes',
    MIN,
  ),
  field(
    26,
    'lossUtility',
    'Mechanical — Utility equipment (air and LPG)',
    S.mechanical,
    'minutes',
    MIN,
  ),
  field(27, 'lossMechanicalTotal', 'Mechanical — Total', S.mechanical, 'minutes', {
    ...MIN,
    readOnly: true,
    formula: 'Σ 21–26',
  }),

  field(28, 'lossPowerEb', 'Electrical — Power failure due to EB', S.electrical, 'minutes', MIN),
  field(29, 'lossMotorCable', 'Electrical — Motor / cable failure', S.electrical, 'minutes', MIN),
  field(
    30,
    'lossAutomation',
    'Electrical — Plant automation failure',
    S.electrical,
    'minutes',
    MIN,
  ),
  field(31, 'lossElectricalTotal', 'Electrical — Total', S.electrical, 'minutes', {
    ...MIN,
    readOnly: true,
    formula: 'Σ 28–30',
  }),
  field(32, 'lossIndentTruck', 'Lack of indent / truck', S.electrical, 'minutes', MIN),

  field(33, 'lossFireDrill', 'Miscellaneous — Fire drill', S.misc, 'minutes', MIN),
  field(34, 'lossTraining', 'Miscellaneous — Training', S.misc, 'minutes', MIN),
  field(35, 'lossManpower', 'Miscellaneous — Manpower issue', S.misc, 'minutes', MIN),
  field(36, 'lossMiscTotal', 'Miscellaneous — Total', S.misc, 'minutes', {
    ...MIN,
    readOnly: true,
    formula: 'Σ 33–35',
  }),

  field(37, 'indentsStatus', 'Indents status', S.accuracy, 'count'),
  field(38, 'pendingIndentReason', 'Reason for pending indent', S.accuracy, 'text', {
    placeholder: 'Enter reason',
    maxLength: 500,
  }),
  field(39, 'accuracyZero', 'Filling accuracy — in 0 gms', S.accuracy, 'percent', PCT),
  field(40, 'accuracy50', 'Filling accuracy — within +/− 50 gms', S.accuracy, 'percent', PCT),
  field(41, 'accuracy100', 'Filling accuracy — within +/− 100 gms', S.accuracy, 'percent', PCT),
  field(
    42,
    'accuracyBeyond100',
    'Filling accuracy — beyond +/− 100 gms',
    S.accuracy,
    'percent',
    PCT,
  ),
  field(43, 'eldTestedPct', '% ELD tested', S.accuracy, 'percent', PCT),
  field(44, 'oldTestedPct', '% OLD tested', S.accuracy, 'percent', PCT),

  field(45, 'mrPinLeak', 'Market return — Pin leak', S.marketReturn, 'count', { unit: 'cyl' }),
  field(46, 'mrPinCut', 'Market return — Pin cut', S.marketReturn, 'count', { unit: 'cyl' }),
  field(47, 'mrBodyLeak', 'Market return — Body leak', S.marketReturn, 'count', { unit: 'cyl' }),
  field(48, 'mrBungLeak', 'Market return — Bung leak', S.marketReturn, 'count', { unit: 'cyl' }),
  field(49, 'mrDptHr', 'Market return — DPT / HR', S.marketReturn, 'count', { unit: 'cyl' }),
  field(50, 'mrWeight', 'Market return — Under weight / over weight', S.marketReturn, 'count', {
    unit: 'cyl',
  }),
  field(51, 'mrOther', 'Market return — Any other reason', S.marketReturn, 'count', {
    unit: 'cyl',
  }),
  field(52, 'mrTotal', 'Market return — Total cylinders', S.marketReturn, 'count', {
    unit: 'cyl',
    readOnly: true,
    formula: 'Σ 45–51',
  }),

  field(53, 'sqcDefective', 'Defective cylinders at SQC (quality check)', S.sqc, 'count'),
  field(54, 'testBathBodyLeak', 'Body leak at test bath', S.sqc, 'count'),
  field(55, 'testBathBungLeak', 'Bung leak at test bath', S.sqc, 'count'),
  field(56, 'sqcTime', 'SQC by Plant Manager — Time', S.sqc, 'time'),
  field(57, 'sqcRemarks', 'SQC by Plant Manager — Remarks', S.sqc, 'text', {
    placeholder: 'Enter remarks',
    maxLength: 1000,
  }),

  field(58, 'meetings', 'Important meeting, VC, seminar', S.notes, 'text', {
    placeholder: 'Enter details',
    maxLength: 1000,
  }),
  field(59, 'licenceRenewal', 'Licence renewal / approval', S.notes, 'text', {
    placeholder: 'Enter details',
    maxLength: 1000,
  }),
  field(60, 'remarks', 'Remarks / comments', S.notes, 'text', {
    placeholder: 'Enter remarks',
    maxLength: 2000,
  }),
] as const satisfies readonly FieldDef[];

export type DailyMisFieldKey = (typeof DAILY_MIS_FIELDS)[number]['key'];

/** Keys stored as their own column on daily_mis (everything except header display fields). */
export const DAILY_MIS_SHOWN_ONLY: readonly DailyMisFieldKey[] = [
  'monthYear',
  'updatedAt',
  'enteredBy',
  'status',
];

/** Keys a client may send (everything not read-only, plant/date included). */
export const DAILY_MIS_INPUT_KEYS = DAILY_MIS_FIELDS.filter(
  (f: FieldDef) => f.readOnly !== true,
).map((f) => f.key);

/** System-computed keys, stored but never accepted from a client. */
export const DAILY_MIS_COMPUTED_KEYS = [
  'closingBookStock',
  'stockGainLoss',
  'lossMechanicalTotal',
  'lossElectricalTotal',
  'lossMiscTotal',
  'mrTotal',
] as const satisfies readonly DailyMisFieldKey[];
