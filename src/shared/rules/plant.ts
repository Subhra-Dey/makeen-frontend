// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { addDays, isIsoDate, type IsoDate } from '../ist';

/**
 * Plant contract end date (PLT-C10, DECISIONS D-15): contract date + period years − 1 day
 * (mockup: 01-04-2022 + 5 years → 31-03-2027). Extension years are stored only, never added.
 * A 29 February contract date rolls to 1 March before the −1 day, so it ends on 28 February.
 */
export function plantEndDate(contractDate: IsoDate, periodYears: number): IsoDate {
  if (!isIsoDate(contractDate)) throw new RangeError(`Invalid contract date: ${contractDate}`);
  if (!Number.isInteger(periodYears) || periodYears < 1 || periodYears > 50) {
    throw new RangeError(`Period of contract must be 1–50 years, got ${String(periodYears)}`);
  }
  const [y, m, d] = contractDate.split('-').map(Number) as [number, number, number];
  const anniversary = new Date(Date.UTC(y + periodYears, m - 1, d)).toISOString().slice(0, 10);
  return addDays(anniversary, -1);
}
