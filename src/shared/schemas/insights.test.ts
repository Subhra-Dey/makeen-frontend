// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import {
  INSIGHT_MESSAGES,
  addMonths,
  breakdownMinutes,
  comparisonQuerySchema,
  dashboardQuerySchema,
  graphsQuerySchema,
  manHourSettingSchema,
  monthsEnding,
  performanceBuckets,
  reviewPackQuerySchema,
  searchQuerySchema,
  shortMonthLabel,
} from './insights';

const PLANT = '0193a000-0000-7000-8000-000000000001';

describe('dashboard search (BTN-D1…D3)', () => {
  it('defaults to All modules and every plant', () => {
    expect(dashboardQuerySchema.parse({})).toEqual({ module: 'ALL' });
  });

  it('takes a date or a month, never both', () => {
    expect(dashboardQuerySchema.safeParse({ date: '2026-10-16' }).success).toBe(true);
    expect(dashboardQuerySchema.safeParse({ month: '2026-09' }).success).toBe(true);
    const both = dashboardQuerySchema.safeParse({ date: '2026-10-16', month: '2026-09' });
    expect(both.success).toBe(false);
    expect(both.error?.issues[0]?.message).toBe(INSIGHT_MESSAGES.dateOrMonth);
  });

  it('refuses a future India date or month and an unknown module', () => {
    expect(dashboardQuerySchema.safeParse({ date: '2999-01-01' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ month: '2999-01' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ module: 'PEOPLE' }).success).toBe(false);
  });
});

describe('Management Review filters (BTN-P4, MR-3)', () => {
  it('day pack or month pack', () => {
    expect(reviewPackQuerySchema.safeParse({ plantId: PLANT, date: '2026-10-15' }).success).toBe(
      true,
    );
    expect(reviewPackQuerySchema.safeParse({ date: '2026-10-15', month: '2026-09' }).success).toBe(
      false,
    );
  });

  it('several dates need one plant and at most 31 days', () => {
    expect(comparisonQuerySchema.safeParse({ mode: 'DATES' }).error?.issues[0]?.message).toBe(
      INSIGHT_MESSAGES.plantRequired,
    );
    const long = comparisonQuerySchema.safeParse({
      mode: 'DATES',
      plantId: PLANT,
      from: '2026-08-01',
      to: '2026-09-15',
    });
    expect(long.error?.issues[0]?.message).toBe(INSIGHT_MESSAGES.rangeTooLong);
    expect(
      comparisonQuerySchema.safeParse({
        mode: 'DATES',
        plantId: PLANT,
        from: '2026-09-01',
        to: '2026-10-01',
      }).success,
    ).toBe(true);
  });
});

describe('Graphs (BTN-P9, GR-4)', () => {
  it('needs a plant', () => {
    expect(graphsQuerySchema.safeParse({}).error?.issues[0]?.message).toBe(
      INSIGHT_MESSAGES.plantRequired,
    );
  });

  it('the man-hour formula needs hours per shift before it is switched on', () => {
    expect(manHourSettingSchema.safeParse({ enabled: false, hoursPerShift: null }).success).toBe(
      true,
    );
    expect(manHourSettingSchema.safeParse({ enabled: true, hoursPerShift: null }).success).toBe(
      false,
    );
    expect(manHourSettingSchema.safeParse({ enabled: true, hoursPerShift: 8 }).success).toBe(true);
    expect(manHourSettingSchema.safeParse({ enabled: true, hoursPerShift: 25 }).success).toBe(
      false,
    );
  });

  it('trend window: six months ending with the chosen one, across a year end', () => {
    expect(monthsEnding('2027-02', 6)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(shortMonthLabel('2026-10')).toBe('Oct 2026');
  });
});

describe('Plant Performance buckets (D-124)', () => {
  it('7D and 30D: one point per day ending today', () => {
    const b = performanceBuckets('7D', '2026-10-16');
    expect(b).toHaveLength(7);
    expect(b[0]).toEqual({ label: '10-10', from: '2026-10-10', to: '2026-10-10' });
    expect(b[6]?.to).toBe('2026-10-16');
    expect(performanceBuckets('30D', '2026-10-16')).toHaveLength(30);
  });

  it('90D: thirteen 7-day buckets, the last ending today', () => {
    const b = performanceBuckets('90D', '2026-10-16');
    expect(b).toHaveLength(13);
    expect(b[12]).toEqual({ label: '10-10', from: '2026-10-10', to: '2026-10-16' });
    expect(b[0]?.from).toBe('2026-07-18');
  });

  it('1Y: twelve calendar months, the current one up to today', () => {
    const b = performanceBuckets('1Y', '2026-10-16');
    expect(b).toHaveLength(12);
    expect(b[0]).toEqual({ label: 'Nov 2025', from: '2025-11-01', to: '2025-11-30' });
    expect(b[11]).toEqual({ label: 'Oct 2026', from: '2026-10-01', to: '2026-10-16' });
  });
});

describe('breakdown minutes (MR-4, D-126)', () => {
  it('mechanical + electrical; nothing entered stays empty', () => {
    expect(breakdownMinutes(75, 40)).toBe(115);
    expect(breakdownMinutes(null, 40)).toBe(40);
    expect(breakdownMinutes(null, null)).toBeNull();
  });
});

describe('command palette search', () => {
  it('needs two characters', () => {
    expect(searchQuerySchema.safeParse({ q: ' a ' }).error?.issues[0]?.message).toBe(
      INSIGHT_MESSAGES.searchTooShort,
    );
    expect(searchQuerySchema.parse({ q: ' Yed ' })).toEqual({ q: 'Yed' });
  });
});
