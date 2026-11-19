// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { averageDecimals, fromScaled, sumDecimals, toScaled, type DecimalInput } from '../decimal';
import { KIND_DECIMALS } from '../fields/types';
import { MONTHLY_SUMMARY_ITEMS, type MonthlySummaryKey } from '../fields/monthly-mis';

/** One Approved Daily MIS row, as far as the Cumulative Daily Summary needs it. */
export type DailyRowForSummary = Readonly<Record<string, DecimalInput>>;

export type CumulativeDailySummary = Readonly<Record<MonthlySummaryKey, string>>;

/**
 * A. Cumulative Daily Summary (MMIS-S1…S25, MMIS-R4).
 * Pass ONLY Approved Daily MIS rows of one plant and one month (the caller filters by status —
 * Draft, Pending and Returned are ignored). MT/counts SUM, percentages AVERAGE, 0 when no rows.
 */
export function cumulativeDailySummary(
  rows: readonly DailyRowForSummary[],
): CumulativeDailySummary {
  const out: Partial<Record<MonthlySummaryKey, string>> = {};
  for (const item of MONTHLY_SUMMARY_ITEMS) {
    const scale = KIND_DECIMALS[item.kind];
    if (item.agg === 'plus') {
      let total = 0n;
      for (const k of item.items) total += toScaled(out[k as MonthlySummaryKey], scale) ?? 0n;
      out[item.key] = fromScaled(total, scale);
    } else if (item.agg === 'avg') {
      out[item.key] = averageDecimals(
        rows.map((r) => r[item.daily[0]]),
        scale,
      );
    } else {
      out[item.key] = sumDecimals(
        rows.flatMap((r) => item.daily.map((k) => r[k])),
        scale,
      );
    }
  }
  return out as CumulativeDailySummary;
}
