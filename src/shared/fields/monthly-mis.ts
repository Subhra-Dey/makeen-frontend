// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import {
  CYLINDER_SIZES,
  CYLINDER_SIZE_LABELS,
  CYLINDER_STAT_CATEGORIES,
  INVENTORY_ITEMS,
  type CylinderSize,
  type CylinderStatCategory,
  type InventoryItem,
} from '../enums';
import type { DailyMisFieldKey } from './daily-mis';
import { field, type FieldDef } from './types';

/**
 * A. Cumulative Daily Summary (items 1–25) — computed from APPROVED Daily MIS only,
 * same plant + month. MT and counts SUM; percentages AVERAGE (spec mapping, verbatim).
 */
export interface SummaryItemDef {
  readonly no: number;
  readonly key: string;
  readonly label: string;
  readonly kind: 'mt' | 'count' | 'minutes' | 'percent' | 'hours';
  /** sum/avg over Daily fields, or plus = sum of earlier summary items. */
  readonly agg: 'sum' | 'avg' | 'plus';
  readonly daily?: readonly DailyMisFieldKey[];
  readonly items?: readonly string[];
  readonly formula: string;
}

export const MONTHLY_SUMMARY_ITEMS = [
  {
    no: 1,
    key: 'normalProduction',
    label: 'Normal production',
    kind: 'mt',
    agg: 'sum',
    daily: ['normalCylinderDespatch', 'normalTtLoading'],
    formula: 'Σ Daily 11 + 12',
  },
  {
    no: 2,
    key: 'normalCylinderDespatch',
    label: 'Normal — Cylinder despatches',
    kind: 'mt',
    agg: 'sum',
    daily: ['normalCylinderDespatch'],
    formula: 'Σ Daily 11',
  },
  {
    no: 3,
    key: 'normalTtLoading',
    label: 'Normal — TT loading',
    kind: 'mt',
    agg: 'sum',
    daily: ['normalTtLoading'],
    formula: 'Σ Daily 12',
  },
  {
    no: 4,
    key: 'otProduction',
    label: 'OT production',
    kind: 'mt',
    agg: 'sum',
    daily: ['otCylinderDespatch', 'otTtLoading'],
    formula: 'Σ Daily 13 + 14',
  },
  {
    no: 5,
    key: 'otCylinderDespatch',
    label: 'OT — Cylinder despatches',
    kind: 'mt',
    agg: 'sum',
    daily: ['otCylinderDespatch'],
    formula: 'Σ Daily 13',
  },
  {
    no: 6,
    key: 'otTtLoading',
    label: 'OT — TT loading',
    kind: 'mt',
    agg: 'sum',
    daily: ['otTtLoading'],
    formula: 'Σ Daily 14',
  },
  {
    no: 7,
    key: 'totalProduction',
    label: 'Total production',
    kind: 'mt',
    agg: 'plus',
    items: ['normalProduction', 'otProduction'],
    formula: 'item 1 + 4',
  },
  {
    no: 8,
    key: 'totalCylinderDespatch',
    label: 'Total — Cylinder despatches',
    kind: 'mt',
    agg: 'plus',
    items: ['normalCylinderDespatch', 'otCylinderDespatch'],
    formula: 'item 2 + 5',
  },
  {
    no: 9,
    key: 'totalTtLoading',
    label: 'Total — TT loading',
    kind: 'mt',
    agg: 'plus',
    items: ['normalTtLoading', 'otTtLoading'],
    formula: 'item 3 + 6',
  },
  {
    no: 10,
    key: 'totalShifts',
    label: 'Total no. of normal shifts operated',
    kind: 'count',
    agg: 'sum',
    daily: ['shiftsOperated'],
    formula: 'Σ Daily 5',
  },
  {
    no: 11,
    key: 'totalOtHours',
    label: 'Total no. of OT hours',
    kind: 'hours',
    agg: 'sum',
    daily: ['otHours'],
    formula: 'Σ Daily 6',
  },
  {
    no: 12,
    key: 'cumulativeReceipts',
    label: 'Cumulative receipts',
    kind: 'mt',
    agg: 'sum',
    daily: ['bulkReceipts'],
    formula: 'Σ Daily 10',
  },
  {
    no: 13,
    key: 'despatchBottling',
    label: 'Cumulative despatches — Bottling',
    kind: 'mt',
    agg: 'sum',
    daily: ['normalCylinderDespatch', 'otCylinderDespatch'],
    formula: 'Σ Daily 11 + 13',
  },
  {
    no: 14,
    key: 'despatchTtLoading',
    label: 'Cumulative despatches — TT loading',
    kind: 'mt',
    agg: 'sum',
    daily: ['normalTtLoading', 'otTtLoading'],
    formula: 'Σ Daily 12 + 14',
  },
  {
    no: 15,
    key: 'stockGainLoss',
    label: 'Cumulative stock gain / loss',
    kind: 'mt',
    agg: 'sum',
    daily: ['stockGainLoss'],
    formula: 'Σ Daily 20',
  },
  {
    no: 16,
    key: 'lossMechanical',
    label: 'Time loss — Mechanical',
    kind: 'minutes',
    agg: 'sum',
    daily: ['lossMechanicalTotal'],
    formula: 'Σ Daily 27',
  },
  {
    no: 17,
    key: 'lossElectrical',
    label: 'Time loss — Electrical',
    kind: 'minutes',
    agg: 'sum',
    daily: ['lossElectricalTotal'],
    formula: 'Σ Daily 31',
  },
  {
    no: 18,
    key: 'lossIndentTruck',
    label: 'Time loss — Lack of indent / truck',
    kind: 'minutes',
    agg: 'sum',
    daily: ['lossIndentTruck'],
    formula: 'Σ Daily 32',
  },
  {
    no: 19,
    key: 'lossMisc',
    label: 'Time loss — Miscellaneous',
    kind: 'minutes',
    agg: 'sum',
    daily: ['lossMiscTotal'],
    formula: 'Σ Daily 36',
  },
  {
    no: 20,
    key: 'accuracyZeroAvg',
    label: 'Filling accuracy — nil variation',
    kind: 'percent',
    agg: 'avg',
    daily: ['accuracyZero'],
    formula: 'AVG Daily 39',
  },
  {
    no: 21,
    key: 'accuracy50Avg',
    label: 'Filling accuracy — +/− 50 gms',
    kind: 'percent',
    agg: 'avg',
    daily: ['accuracy50'],
    formula: 'AVG Daily 40',
  },
  {
    no: 22,
    key: 'accuracy100Avg',
    label: 'Filling accuracy — +/− 100 gms',
    kind: 'percent',
    agg: 'avg',
    daily: ['accuracy100'],
    formula: 'AVG Daily 41',
  },
  {
    no: 23,
    key: 'eldAvg',
    label: 'Sort-out % ELD',
    kind: 'percent',
    agg: 'avg',
    daily: ['eldTestedPct'],
    formula: 'AVG Daily 43',
  },
  {
    no: 24,
    key: 'oldAvg',
    label: 'Sort-out % OLD',
    kind: 'percent',
    agg: 'avg',
    daily: ['oldTestedPct'],
    formula: 'AVG Daily 44',
  },
  {
    no: 25,
    key: 'marketReturns',
    label: 'Cumulative market returns',
    kind: 'count',
    agg: 'sum',
    daily: ['mrTotal'],
    formula: 'Σ Daily 52',
  },
] as const satisfies readonly SummaryItemDef[];

export type MonthlySummaryKey = (typeof MONTHLY_SUMMARY_ITEMS)[number]['key'];

export const MONTHLY_MIS_SECTIONS = {
  energy: 'Monthly Inputs — energy & diesel',
  revenue: 'Monthly Inputs — revenue, cost & penalties',
  training: 'Monthly Inputs — training, power & solar',
  spares: 'Monthly Inputs — spares, cycle counts & paints',
  cylinders: 'Cylinder testing & closing inventory',
  remarks: 'Remarks',
} as const;

const S = MONTHLY_MIS_SECTIONS;
const RS = { unit: 'Rs.' } as const;
const PCT = { unit: '%' } as const;
const L = { unit: 'litres' } as const;

/** B. Monthly Inputs 26–69 and 122 — stored as columns on monthly_mis. */
export const MONTHLY_MIS_INPUT_FIELDS = [
  field(26, 'ebUnits', 'Electricity units — EB', S.energy, 'units', { unit: 'kW' }),
  field(27, 'dgUnits', 'Electricity units — DG set', S.energy, 'units', { unit: 'kW' }),
  field(28, 'energyCharges', 'Monthly energy charges (incl GST)', S.energy, 'rupees', RS),
  field(29, 'electricityBill', 'Electricity bill', S.energy, 'rupees', RS),
  field(30, 'dieselBill', 'Diesel bill', S.energy, 'rupees', RS),
  field(31, 'dieselDg', 'Diesel consumed — DG set', S.energy, 'litres', L),
  field(32, 'dieselFireEngine', 'Diesel consumed — Fire engine', S.energy, 'litres', L),
  field(33, 'hoursDg', 'Hours operated — DG set', S.energy, 'hours', { unit: 'h' }),
  field(34, 'hoursFireEngine', 'Hours operated — Fire engine', S.energy, 'hours', { unit: 'h' }),
  field(
    35,
    'bottlingRevenue',
    'Bottling and TT loading — Revenue (excl GST)',
    S.revenue,
    'rupees',
    RS,
  ),
  field(
    36,
    'bottlingExpenditure',
    'Bottling and TT loading — Expenditure (excl GST)',
    S.revenue,
    'rupees',
    RS,
  ),
  field(37, 'retestingRevenue', 'Cylinder retesting — Revenue (excl GST)', S.revenue, 'rupees', RS),
  field(
    38,
    'retestingExpenditure',
    'Cylinder retesting — Expenditure (excl GST)',
    S.revenue,
    'rupees',
    RS,
  ),
  field(39, 'opexPerCylinder', 'Opex cost per cylinder (excl GST)', S.revenue, 'rupees', RS),
  field(40, 'operatingCostPerMt', 'Operating cost / MT for the month', S.revenue, 'rupees', RS),
  field(41, 'tenderCostPerMt', 'Cost / MT as per tender', S.revenue, 'rupees', RS),
  field(
    42,
    'penaltyIncurred',
    'Penalties incurred by OMC in previous month bill',
    S.revenue,
    'yesno',
  ),
  field(43, 'penaltyDetails', 'If Yes — reason and expenses', S.revenue, 'text', {
    placeholder: 'Enter reason and amount',
    maxLength: 1000,
  }),
  field(44, 'trainingStaff', 'Trainings (minimum 2 hours) — MAKEEN staff', S.training, 'count'),
  field(45, 'trainingWorkmen', 'Trainings — Contract workmen', S.training, 'count'),
  field(46, 'trainingDrivers', 'Trainings — Drivers', S.training, 'count'),
  field(47, 'trainingTotal', 'Total trainings', S.training, 'count', {
    readOnly: true,
    formula: 'Σ 44–46',
  }),
  field(48, 'unitsPerMt', 'Units consumed / MT production', S.training, 'units'),
  field(49, 'powerFactor', 'Power factor', S.training, 'ratio', { maxValue: 1 }),
  field(50, 'contractDemandKva', 'Electricity contract demand', S.training, 'units', {
    unit: 'kVA',
  }),
  field(51, 'maxDemandKva', 'Electricity max recorded demand', S.training, 'units', {
    unit: 'kVA',
  }),
  field(52, 'solarAvailable', 'Solar plant available', S.training, 'yesno'),
  field(53, 'solarCapacity', 'If Yes — capacity', S.training, 'text', {
    placeholder: 'e.g. 100 kW',
    maxLength: 100,
  }),
  field(54, 'solarUnits', 'Units generated through solar', S.training, 'units', { unit: 'kW' }),
  field(55, 'capsUsedPct', '% caps used', S.spares, 'percent', PCT),
  field(56, 'sealsUsedPct', '% seals used', S.spares, 'percent', PCT),
  field(57, 'oRingsReplacedPct', '% O-rings replaced', S.spares, 'percent', PCT),
  field(58, 'valvesReplacedPct', '% valves replaced', S.spares, 'percent', PCT),
  field(59, 'brownSoapKg', 'Brown soap for conveyor', S.spares, 'units', { unit: 'kgs' }),
  field(60, 'teflonTape', 'Teflon tape consumed', S.spares, 'units'),
  field(61, 'defectiveMarketReturn', 'Defective market return cylinders', S.spares, 'count'),
  field(
    62,
    'cvrCycleCountDate',
    'Last cylinder / valve / regulator / seals / O-rings cycle count',
    S.spares,
    'date',
  ),
  field(63, 'cvrCycleDeviation', 'Deviation on that cycle count', S.spares, 'yesno'),
  field(64, 'warehouseCycleCountDate', 'MEIN warehouse spares cycle count', S.spares, 'date'),
  field(65, 'warehouseCycleDeviation', 'Deviation on that cycle count', S.spares, 'yesno'),
  field(66, 'paintSignalRed', 'Paints and thinner — Signal Red', S.spares, 'litres', L),
  field(67, 'paintPrimer', 'Paints and thinner — Primer', S.spares, 'litres', L),
  field(
    68,
    'paintStencil',
    'Paints and thinner — Other paints for stencilling',
    S.spares,
    'litres',
    L,
  ),
  field(69, 'thinner', 'Paints and thinner — Thinner', S.spares, 'litres', L),
  field(122, 'remarks', 'Remarks', S.remarks, 'text', {
    placeholder: 'Enter remarks',
    maxLength: 2000,
  }),
] as const satisfies readonly FieldDef[];

export type MonthlyMisInputKey = (typeof MONTHLY_MIS_INPUT_FIELDS)[number]['key'];

/** Items 70–104: category × size (7 sizes, two separate 35 kg columns). */
export const CYLINDER_STAT_ROWS: readonly {
  readonly category: CylinderStatCategory;
  readonly label: string;
  readonly firstNo: number;
}[] = [
  { category: 'DUE_TESTING', label: 'Due for pressure testing (generated)', firstNo: 70 },
  {
    category: 'TESTED_DESPATCHED',
    label: 'Cylinder testing done and despatched for filling',
    firstNo: 77,
  },
  {
    category: 'CLOSING_DUE_TESTING',
    label: 'Closing inventory, due for pressure testing',
    firstNo: 84,
  },
  { category: 'CLOSING_HOT_REPAIR', label: 'Closing inventory, hot repair', firstNo: 91 },
  { category: 'CLOSING_SCRAP', label: 'Closing inventory, scrap CVR', firstNo: 98 },
];

/** Spec number of one cylinder cell, e.g. (DUE_TESTING, KG35_B) → 75. */
export function cylinderFieldNo(category: CylinderStatCategory, size: CylinderSize): number {
  const row = CYLINDER_STAT_ROWS.find((r) => r.category === category);
  if (!row) throw new RangeError(`Unknown cylinder category ${category}`);
  return row.firstNo + CYLINDER_SIZES.indexOf(size);
}

/** Items 105–121. */
export const INVENTORY_ITEM_DEFS: readonly {
  readonly item: InventoryItem;
  readonly no: number;
  readonly group: 'SCRAP_PARTS' | 'NEW_CVR' | 'DPT_PAINT';
  readonly label: string;
  readonly unit: string;
}[] = [
  { item: 'SCRAP_SC_VALVE', no: 105, group: 'SCRAP_PARTS', label: 'SC Valve', unit: 'nos' },
  { item: 'SCRAP_REGULATOR', no: 106, group: 'SCRAP_PARTS', label: 'Regulator', unit: 'nos' },
  { item: 'NEW_SC_VALVE', no: 107, group: 'NEW_CVR', label: 'SC Valve', unit: 'nos' },
  { item: 'NEW_REGULATOR', no: 108, group: 'NEW_CVR', label: 'Regulator', unit: 'nos' },
  { item: 'NEW_O_RINGS', no: 109, group: 'NEW_CVR', label: 'O Rings', unit: 'nos' },
  { item: 'NEW_TE_SEALS', no: 110, group: 'NEW_CVR', label: 'Tamper Evident Seals', unit: 'nos' },
  { item: 'NEW_SAFETY_CAPS', no: 111, group: 'NEW_CVR', label: 'Safety Caps', unit: 'nos' },
  { item: 'NEW_NYLON_THREAD', no: 112, group: 'NEW_CVR', label: 'Nylon Thread', unit: 'nos' },
  { item: 'NEW_SS_CLIP', no: 113, group: 'NEW_CVR', label: 'SS Clip', unit: 'nos' },
  { item: 'NEW_TEFLON_TAPE', no: 114, group: 'NEW_CVR', label: 'Teflon Tape', unit: 'nos' },
  {
    item: 'DPT_ZINC_CHROMATE_PRIMER',
    no: 115,
    group: 'DPT_PAINT',
    label: 'Zinc Chromate Primer',
    unit: 'litres',
  },
  { item: 'DPT_SIGNAL_RED', no: 116, group: 'DPT_PAINT', label: 'Signal Red', unit: 'litres' },
  { item: 'DPT_OXFORD_BLUE', no: 117, group: 'DPT_PAINT', label: 'Oxford Blue', unit: 'litres' },
  { item: 'DPT_WHITE', no: 118, group: 'DPT_PAINT', label: 'White', unit: 'litres' },
  { item: 'DPT_YELLOW', no: 119, group: 'DPT_PAINT', label: 'Yellow', unit: 'litres' },
  { item: 'DPT_BLACK', no: 120, group: 'DPT_PAINT', label: 'Black', unit: 'litres' },
  {
    item: 'DPT_STENCIL',
    no: 121,
    group: 'DPT_PAINT',
    label: 'Other paint for stencilling',
    unit: 'litres',
  },
];

/** Every Monthly MIS item number 1–122 must be defined exactly once (checked by a test). */
export function allMonthlyItemNumbers(): number[] {
  const nos = [
    ...MONTHLY_SUMMARY_ITEMS.map((i) => i.no),
    ...MONTHLY_MIS_INPUT_FIELDS.map((f) => f.no),
    ...CYLINDER_STAT_CATEGORIES.flatMap((c) => CYLINDER_SIZES.map((s) => cylinderFieldNo(c, s))),
    ...INVENTORY_ITEMS.map((i) => {
      const def = INVENTORY_ITEM_DEFS.find((d) => d.item === i);
      if (!def) throw new RangeError(`Inventory item ${i} has no definition`);
      return def.no;
    }),
  ];
  return nos.sort((a, b) => a - b);
}

export { CYLINDER_SIZE_LABELS };
