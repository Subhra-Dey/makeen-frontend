import { bottlingDespatches, computeDailyMisDerived } from './daily-mis';
import { cumulativeDailySummary } from './monthly-summary';
import { plantEndDate } from './plant';

/** The mockup's exact HPCL Yediyur 15-10-2026 record. */
const yediyur15Oct = {
  openingStock: '412.380',
  bulkReceipts: '180.000',
  normalCylinderDespatch: '198.420',
  normalTtLoading: '12.000',
  otCylinderDespatch: '14.260',
  otTtLoading: '0.000',
  prcnReturn: '0.850',
  physicalStock: '368.430',
  lossCarousel: 15,
  lossEld: 0,
  lossOld: 10,
  lossConveyor: 20,
  lossUpDownStream: 0,
  lossUtility: 5,
  lossPowerEb: 35,
  lossMotorCable: 0,
  lossAutomation: 0,
  lossFireDrill: 30,
  lossTraining: 0,
  lossManpower: 0,
  mrPinLeak: 3,
  mrPinCut: 1,
  mrBodyLeak: 0,
  mrBungLeak: 2,
  mrDptHr: 0,
  mrWeight: 4,
  mrOther: 1,
};

describe('Daily MIS system sums (D-13)', () => {
  it('reproduces the mockup record exactly', () => {
    expect(computeDailyMisDerived(yediyur15Oct)).toEqual({
      closingBookStock: '368.550',
      stockGainLoss: '-0.120',
      lossMechanicalTotal: 50,
      lossElectricalTotal: 35,
      lossMiscTotal: 30,
      mrTotal: 11,
    });
    expect(bottlingDespatches(yediyur15Oct)).toBe('212.680');
  });

  it('leaves closing stock and gain/loss empty until their inputs exist; sums treat blanks as 0', () => {
    const d = computeDailyMisDerived({ lossCarousel: 5 });
    expect(d.closingBookStock).toBeNull();
    expect(d.stockGainLoss).toBeNull();
    expect(d.lossMechanicalTotal).toBe(5);
    expect(d.mrTotal).toBe(0);
    expect(computeDailyMisDerived({ openingStock: '100.000' }).stockGainLoss).toBeNull();
  });
});

describe('Cumulative Daily Summary (MMIS-R4)', () => {
  const day = (over: Record<string, string>) => ({
    normalCylinderDespatch: '100.000',
    normalTtLoading: '10.000',
    otCylinderDespatch: '5.000',
    otTtLoading: '0.000',
    shiftsOperated: '2',
    otHours: '3.00',
    bulkReceipts: '120.000',
    stockGainLoss: '-0.100',
    lossMechanicalTotal: '40',
    lossElectricalTotal: '30',
    lossIndentTruck: '0',
    lossMiscTotal: '15',
    accuracyZero: '62.40',
    accuracy50: '34.40',
    accuracy100: '2.90',
    eldTestedPct: '100.00',
    oldTestedPct: '99.00',
    mrTotal: '11',
    ...over,
  });

  it('sums MT and counts, averages percentages, and adds items 1+4 etc.', () => {
    const s = cumulativeDailySummary([day({}), day({ accuracyZero: '61.20', otHours: '4.00' })]);
    expect(s.normalProduction).toBe('220.000');
    expect(s.otProduction).toBe('10.000');
    expect(s.totalProduction).toBe('230.000');
    expect(s.totalCylinderDespatch).toBe('210.000');
    expect(s.despatchBottling).toBe('210.000');
    expect(s.totalShifts).toBe('4');
    expect(s.totalOtHours).toBe('7.00');
    expect(s.stockGainLoss).toBe('-0.200');
    expect(s.lossMechanical).toBe('80');
    expect(s.accuracyZeroAvg).toBe('61.80');
    expect(s.marketReturns).toBe('22');
  });

  it('shows 0 when the month has no Approved Daily rows', () => {
    const s = cumulativeDailySummary([]);
    expect(s.totalProduction).toBe('0.000');
    expect(s.accuracyZeroAvg).toBe('0.00');
    expect(s.marketReturns).toBe('0');
  });
});

describe('plant contract end date (D-15)', () => {
  it('matches the mockup', () => {
    expect(plantEndDate('2022-04-01', 5)).toBe('2027-03-31');
    expect(plantEndDate('2024-01-01', 3)).toBe('2026-12-31');
    expect(plantEndDate('2021-06-15', 5)).toBe('2026-06-14');
  });
  it('handles a 29 February contract date', () => {
    expect(plantEndDate('2024-02-29', 1)).toBe('2025-02-28');
    expect(plantEndDate('2024-02-29', 4)).toBe('2028-02-28');
  });
  it('rejects nonsense periods', () => {
    expect(() => plantEndDate('2024-01-01', 0)).toThrow(RangeError);
  });
});
