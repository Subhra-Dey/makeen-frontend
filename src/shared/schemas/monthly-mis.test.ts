// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { addDays, istCurrentMonth, istToday } from '../ist';
import { FIELD_MESSAGES } from './field-values';
import {
  MONTHLY_MIS_MESSAGES,
  MONTHLY_MIS_VALUE_FIELDS,
  cylinderGridSchema,
  inventoryKind,
  inventorySchema,
  monthlyMisQuerySchema,
  monthlyMisSaveSchema,
  monthlyMisValuesSchema,
  trainingTotalOf,
} from './monthly-mis';

const PLANT = '0190a000-0000-7000-8000-000000000001';

function issues(r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

describe('Monthly MIS value fields', () => {
  it('are items 26–69 and 122 without the system total 47', () => {
    const nos = MONTHLY_MIS_VALUE_FIELDS.map((f) => f.no);
    expect(nos).toHaveLength(44);
    expect(nos).not.toContain(47);
    expect(nos).toContain(122);
  });
});

describe('monthlyMisValuesSchema', () => {
  it('normalises numbers, Yes/No and dates; drops the system total 47', () => {
    const v = monthlyMisValuesSchema.parse({
      ebUnits: '18,420',
      powerFactor: '0.98',
      trainingStaff: '4',
      penaltyIncurred: 'NO',
      cvrCycleCountDate: '2026-09-12',
      remarks: '  fine  ',
      dgUnits: '',
      trainingTotal: 999,
    });
    expect(v).toMatchObject({
      ebUnits: '18420.00',
      powerFactor: '0.980',
      trainingStaff: 4,
      penaltyIncurred: 'NO',
      cvrCycleCountDate: '2026-09-12',
      remarks: 'fine',
      dgUnits: null,
    });
    expect(v).not.toHaveProperty('trainingTotal');
  });

  it('rejects a power factor above 1, a percentage above 100 and a future date', () => {
    const r = monthlyMisValuesSchema.safeParse({
      powerFactor: '1.2',
      capsUsedPct: '120',
      warehouseCycleCountDate: addDays(istToday(), 1),
    });
    const m = issues(r);
    expect(m['powerFactor']).toBe(FIELD_MESSAGES.atMost(1));
    expect(m['capsUsedPct']).toBe(FIELD_MESSAGES.percent);
    expect(m['warehouseCycleCountDate']).toBe(FIELD_MESSAGES.dateFuture);
  });

  it('limits the text fields to their column length', () => {
    const r = monthlyMisValuesSchema.safeParse({ solarCapacity: 'x'.repeat(101) });
    expect(issues(r)['solarCapacity']).toBe(FIELD_MESSAGES.tooLong(100));
  });
});

describe('item 47 (trainingTotalOf)', () => {
  it('is Σ 44–46, blanks count as 0', () => {
    expect(trainingTotalOf({ trainingStaff: 4, trainingWorkmen: '6', trainingDrivers: null })).toBe(
      10,
    );
    expect(trainingTotalOf({})).toBe(0);
  });
});

describe('cylinder grid and inventory', () => {
  it('keeps both 35 kg columns separate and fills missing rows with blanks', () => {
    const g = cylinderGridSchema.parse({ DUE_TESTING: { KG35_A: '12', KG35_B: 3 } });
    expect(g.DUE_TESTING.KG35_A).toBe(12);
    expect(g.DUE_TESTING.KG35_B).toBe(3);
    expect(g.CLOSING_SCRAP).toBeDefined();
  });

  it('rejects negative and fractional counts', () => {
    expect(cylinderGridSchema.safeParse({ CLOSING_HOT_REPAIR: { KG5: -1 } }).success).toBe(false);
    expect(cylinderGridSchema.safeParse({ CLOSING_HOT_REPAIR: { KG5: 1.5 } }).success).toBe(false);
  });

  it('parts are whole numbers; DPT paints are litres with 2 decimals', () => {
    expect(inventoryKind('NEW_O_RINGS')).toBe('count');
    expect(inventoryKind('DPT_WHITE')).toBe('litres');
    const v = inventorySchema.parse({ NEW_O_RINGS: '240', DPT_WHITE: '12.5' });
    expect(v.NEW_O_RINGS).toBe(240);
    expect(v.DPT_WHITE).toBe('12.50');
    expect(inventorySchema.safeParse({ NEW_SS_CLIP: '2.5' }).success).toBe(false);
  });
});

describe('monthlyMisSaveSchema', () => {
  const base = { plantId: PLANT, month: '2026-09' };

  it('accepts an incomplete Draft', () => {
    const r = monthlyMisSaveSchema.safeParse({
      ...base,
      action: 'draft',
      values: { penaltyIncurred: 'YES', solarAvailable: 'YES' },
    });
    expect(r.success).toBe(true);
  });

  it('on Submit, penalty Yes needs a reason and solar Yes needs a capacity (UXV-10)', () => {
    const r = monthlyMisSaveSchema.safeParse({
      ...base,
      action: 'submit',
      values: { penaltyIncurred: 'YES', solarAvailable: 'YES' },
    });
    const m = issues(r);
    expect(m['values.penaltyDetails']).toBe(MONTHLY_MIS_MESSAGES.penaltyReasonRequired);
    expect(m['values.solarCapacity']).toBe(MONTHLY_MIS_MESSAGES.solarCapacityRequired);
    const ok = monthlyMisSaveSchema.safeParse({
      ...base,
      action: 'submit',
      values: {
        penaltyIncurred: 'YES',
        penaltyDetails: 'Late despatch — Rs. 12,000',
        solarAvailable: 'YES',
        solarCapacity: '100 kW',
      },
    });
    expect(ok.success).toBe(true);
  });

  it('needs a real month that is not in the future (MMIS-H2)', () => {
    expect(
      issues(monthlyMisSaveSchema.safeParse({ ...base, action: 'draft', month: '' })),
    ).toHaveProperty('month', MONTHLY_MIS_MESSAGES.monthRequired);
    expect(
      issues(monthlyMisSaveSchema.safeParse({ ...base, action: 'draft', month: '2026-13' }))[
        'month'
      ],
    ).toBe(MONTHLY_MIS_MESSAGES.monthInvalid);
    expect(
      issues(
        monthlyMisSaveSchema.safeParse({
          ...base,
          action: 'draft',
          month: nextMonth(istCurrentMonth()),
        }),
      )['month'],
    ).toBe(MONTHLY_MIS_MESSAGES.monthFuture);
    expect(
      monthlyMisSaveSchema.safeParse({ ...base, action: 'draft', month: istCurrentMonth() })
        .success,
    ).toBe(true);
  });
});

describe('monthlyMisQuerySchema', () => {
  it('pages by default and checks the month', () => {
    expect(monthlyMisQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 50 });
    expect(monthlyMisQuerySchema.safeParse({ month: 'Sep 2026' }).success).toBe(false);
  });
});
