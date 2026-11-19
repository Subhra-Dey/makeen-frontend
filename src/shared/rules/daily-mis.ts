// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { fromScaled, sumInts, toScaled, type DecimalInput } from '../decimal';

/** Inputs needed for the Daily MIS system sums (all optional on a draft). */
export interface DailyMisSumInputs {
  openingStock?: DecimalInput;
  bulkReceipts?: DecimalInput;
  normalCylinderDespatch?: DecimalInput;
  normalTtLoading?: DecimalInput;
  otCylinderDespatch?: DecimalInput;
  otTtLoading?: DecimalInput;
  prcnReturn?: DecimalInput;
  physicalStock?: DecimalInput;
  lossCarousel?: number | null;
  lossEld?: number | null;
  lossOld?: number | null;
  lossConveyor?: number | null;
  lossUpDownStream?: number | null;
  lossUtility?: number | null;
  lossPowerEb?: number | null;
  lossMotorCable?: number | null;
  lossAutomation?: number | null;
  lossFireDrill?: number | null;
  lossTraining?: number | null;
  lossManpower?: number | null;
  mrPinLeak?: number | null;
  mrPinCut?: number | null;
  mrBodyLeak?: number | null;
  mrBungLeak?: number | null;
  mrDptHr?: number | null;
  mrWeight?: number | null;
  mrOther?: number | null;
}

export interface DailyMisDerived {
  /** 18 = 9 + 10 − (11 + 12 + 13 + 14) + 17 · null until opening stock is entered. */
  closingBookStock: string | null;
  /** 20 = 19 − 18 · null until physical stock and closing book stock exist. */
  stockGainLoss: string | null;
  /** 27 = Σ 21–26 */
  lossMechanicalTotal: number;
  /** 31 = Σ 28–30 */
  lossElectricalTotal: number;
  /** 36 = Σ 33–35 */
  lossMiscTotal: number;
  /** 52 = Σ 45–51 */
  mrTotal: number;
}

const MT = 3;

/**
 * Every Daily MIS system sum (spec: “Totals are system sums. Never let the person type a total.”;
 * DECISIONS D-13 for 18 and 20). The API stores these values; a database CHECK enforces the same
 * formulas, and the form shows a live preview from this same function.
 */
export function computeDailyMisDerived(i: DailyMisSumInputs): DailyMisDerived {
  const opening = toScaled(i.openingStock, MT);
  let closing: bigint | null = null;
  if (opening !== null) {
    closing =
      opening +
      (toScaled(i.bulkReceipts, MT) ?? 0n) -
      ((toScaled(i.normalCylinderDespatch, MT) ?? 0n) +
        (toScaled(i.normalTtLoading, MT) ?? 0n) +
        (toScaled(i.otCylinderDespatch, MT) ?? 0n) +
        (toScaled(i.otTtLoading, MT) ?? 0n)) +
      (toScaled(i.prcnReturn, MT) ?? 0n);
  }
  const physical = toScaled(i.physicalStock, MT);
  return {
    closingBookStock: closing === null ? null : fromScaled(closing, MT),
    stockGainLoss:
      closing === null || physical === null ? null : fromScaled(physical - closing, MT),
    lossMechanicalTotal: sumInts([
      i.lossCarousel,
      i.lossEld,
      i.lossOld,
      i.lossConveyor,
      i.lossUpDownStream,
      i.lossUtility,
    ]),
    lossElectricalTotal: sumInts([i.lossPowerEb, i.lossMotorCable, i.lossAutomation]),
    lossMiscTotal: sumInts([i.lossFireDrill, i.lossTraining, i.lossManpower]),
    mrTotal: sumInts([
      i.mrPinLeak,
      i.mrPinCut,
      i.mrBodyLeak,
      i.mrBungLeak,
      i.mrDptHr,
      i.mrWeight,
      i.mrOther,
    ]),
  };
}

/** Daily MIS table column 4: bottling despatches = field 11 + field 13. */
export function bottlingDespatches(i: DailyMisSumInputs): string | null {
  const a = toScaled(i.normalCylinderDespatch, MT);
  const b = toScaled(i.otCylinderDespatch, MT);
  if (a === null && b === null) return null;
  return fromScaled((a ?? 0n) + (b ?? 0n), MT);
}
