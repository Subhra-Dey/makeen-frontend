// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { addDays, istToday } from '../ist';
import {
  DAILY_MIS_VALUE_FIELDS,
  accuracySumWarning,
  dailyMisQuerySchema,
  dailyMisSaveSchema,
  dailyMisValuesSchema,
  deriveDailyMis,
  returnSchema,
} from './daily-mis';
import { FIELD_MESSAGES } from './field-values';

const PLANT = '0190a000-0000-7000-8000-000000000001';

function issues(r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));
}

describe('Daily MIS value fields', () => {
  it('are the 48 typed fields: 60 minus plant, date, 4 shown and 6 system sums', () => {
    expect(DAILY_MIS_VALUE_FIELDS).toHaveLength(48);
    expect(DAILY_MIS_VALUE_FIELDS.map((f) => f.no)).not.toContain(18);
    expect(DAILY_MIS_VALUE_FIELDS.map((f) => f.no)).not.toContain(27);
  });
});

describe('dailyMisValuesSchema', () => {
  it('normalises numbers: fixed decimals, Indian commas, blanks to null', () => {
    const v = dailyMisValuesSchema.parse({
      openingStock: '412.38',
      cylFilled142: '14,200',
      accuracyZero: 62.4,
      otHours: '4',
      shiftsOperated: 2,
      sqcTime: '11:30',
      remarks: '  ok  ',
      physicalStock: '',
    });
    expect(v).toMatchObject({
      openingStock: '412.380',
      cylFilled142: 14200,
      accuracyZero: '62.40',
      otHours: '4.00',
      shiftsOperated: '2',
      sqcTime: '11:30',
      remarks: 'ok',
      physicalStock: null,
    });
  });

  it('drops every system total a client sends (SEC-14)', () => {
    const v = dailyMisValuesSchema.parse({
      closingBookStock: '999.000',
      mrTotal: 5,
      lossCarousel: 1,
    });
    expect(v).not.toHaveProperty('closingBookStock');
    expect(v).not.toHaveProperty('mrTotal');
  });

  it('gives a message per bad field (D-14 ranges)', () => {
    const r = dailyMisValuesSchema.safeParse({
      openingStock: '-1',
      bulkReceipts: '1.2345',
      accuracyZero: '100.01',
      otHours: '25',
      lossCarousel: '1.5',
      sqcTime: '25:00',
      shiftsOperated: '4',
      pendingIndentReason: 'x'.repeat(501),
      physicalStock: 'abc',
    });
    expect(issues(r)).toEqual({
      openingStock: FIELD_MESSAGES.negative,
      bulkReceipts: FIELD_MESSAGES.decimals(3),
      accuracyZero: FIELD_MESSAGES.percent,
      otHours: FIELD_MESSAGES.atMost(24),
      lossCarousel: FIELD_MESSAGES.whole,
      sqcTime: FIELD_MESSAGES.time,
      shiftsOperated: FIELD_MESSAGES.option,
      pendingIndentReason: FIELD_MESSAGES.tooLong(500),
      physicalStock: FIELD_MESSAGES.number,
    });
  });
});

describe('dailyMisSaveSchema', () => {
  it('needs plant and date, and refuses a future India date (UXV-7)', () => {
    expect(issues(dailyMisSaveSchema.safeParse({ action: 'draft' }))).toMatchObject({
      plantId: FIELD_MESSAGES.plantRequired,
      reportDate: FIELD_MESSAGES.dateRequired,
    });
    const tomorrow = addDays(istToday(), 1);
    expect(
      issues(
        dailyMisSaveSchema.safeParse({ action: 'submit', plantId: PLANT, reportDate: tomorrow }),
      ),
    ).toEqual({ reportDate: FIELD_MESSAGES.dateFuture });
    expect(
      dailyMisSaveSchema.safeParse({ action: 'submit', plantId: PLANT, reportDate: istToday() })
        .success,
    ).toBe(true);
    expect(
      issues(
        dailyMisSaveSchema.safeParse({ action: 'draft', plantId: PLANT, reportDate: '2026-02-30' }),
      ),
    ).toEqual({ reportDate: FIELD_MESSAGES.dateInvalid });
  });
});

describe('deriveDailyMis (DMIS-R5, D-13)', () => {
  it('matches the mockup: HPCL Yediyur 15-10-2026', () => {
    const d = deriveDailyMis({
      openingStock: '412.380',
      bulkReceipts: '180.000',
      normalCylinderDespatch: '198.420',
      normalTtLoading: '12.000',
      otCylinderDespatch: '14.260',
      otTtLoading: '0.000',
      prcnReturn: '0.850',
      physicalStock: '368.430',
      lossCarousel: '15',
      lossOld: 10,
      lossConveyor: '20',
      lossUtility: '5',
      lossPowerEb: '35',
      lossFireDrill: '30',
      mrPinLeak: '3',
      mrPinCut: 1,
      mrBungLeak: '2',
      mrWeight: '4',
      mrOther: '1',
    });
    expect(d).toEqual({
      closingBookStock: '368.550',
      stockGainLoss: '-0.120',
      lossMechanicalTotal: 50,
      lossElectricalTotal: 35,
      lossMiscTotal: 30,
      mrTotal: 11,
    });
  });

  it('ignores entries it cannot read (the save reports them)', () => {
    expect(deriveDailyMis({ lossCarousel: 'abc', lossEld: '5', openingStock: 'x' })).toMatchObject({
      lossMechanicalTotal: 5,
      closingBookStock: null,
    });
  });
});

describe('other Daily MIS schemas', () => {
  it('Return needs a reason (UXV-8)', () => {
    expect(returnSchema.safeParse({ version: 1, reason: '   ' }).success).toBe(false);
    expect(returnSchema.safeParse({ version: 1, reason: 'Recheck stock' }).success).toBe(true);
  });

  it('date range: to ≥ from, at most 366 days', () => {
    expect(dailyMisQuerySchema.safeParse({ from: '2026-10-16', to: '2026-10-01' }).success).toBe(
      false,
    );
    expect(dailyMisQuerySchema.safeParse({ from: '2025-01-01', to: '2026-10-01' }).success).toBe(
      false,
    );
    expect(dailyMisQuerySchema.parse({ from: '2026-10-01', to: '2026-10-16' })).toMatchObject({
      page: 1,
    });
  });

  it('accuracy 39–42 not adding to 100 is only a warning (D-14)', () => {
    const ok = {
      accuracyZero: '62.40',
      accuracy50: '34.40',
      accuracy100: '2.90',
      accuracyBeyond100: '0.30',
    };
    expect(accuracySumWarning(ok)).toBeNull();
    expect(accuracySumWarning({ ...ok, accuracyBeyond100: '1.00' })).toMatch(/100.70/);
    expect(accuracySumWarning({ accuracyZero: '50' })).toBeNull();
  });
});
