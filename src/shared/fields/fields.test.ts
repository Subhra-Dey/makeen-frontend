import { CYLINDER_SIZES } from '../enums';
import {
  DAILY_EXCEPTION_LINES,
  DAILY_MIS_COMPUTED_KEYS,
  DAILY_MIS_FIELDS,
  DAILY_MIS_INPUT_KEYS,
  MONTHLY_SUMMARY_ITEMS,
  allMonthlyItemNumbers,
  cylinderFieldNo,
} from './index';

describe('Daily MIS field definitions', () => {
  it('defines fields 1–60 exactly once, in order', () => {
    expect(DAILY_MIS_FIELDS.map((f) => f.no)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(new Set(DAILY_MIS_FIELDS.map((f) => f.key)).size).toBe(60);
  });

  it('marks every system sum and shown field read-only, and none of them are inputs', () => {
    for (const k of DAILY_MIS_COMPUTED_KEYS) {
      expect(DAILY_MIS_FIELDS.find((f) => f.key === k)?.readOnly).toBe(true);
      expect(DAILY_MIS_INPUT_KEYS).not.toContain(k);
    }
    expect(DAILY_MIS_INPUT_KEYS).not.toContain('enteredBy');
    expect(DAILY_MIS_INPUT_KEYS).toContain('plantId');
  });

  it('uses the spec placeholders (MT 0.000, % 0.00, minutes 0, time hh:mm)', () => {
    const byNo = (n: number) => DAILY_MIS_FIELDS.find((f) => f.no === n);
    expect(byNo(9)?.placeholder).toBe('0.000');
    expect(byNo(9)?.decimals).toBe(3);
    expect(byNo(39)?.placeholder).toBe('0.00');
    expect(byNo(21)?.placeholder).toBe('0');
    expect(byNo(56)?.placeholder).toBe('hh:mm');
    expect(byNo(2)?.placeholder).toBe('dd-mm-yyyy');
  });
});

describe('Monthly MIS item definitions', () => {
  it('defines items 1–122 exactly once', () => {
    expect(allMonthlyItemNumbers()).toEqual(Array.from({ length: 122 }, (_, i) => i + 1));
  });

  it('keeps the two 35 kg columns as separate fields', () => {
    expect(cylinderFieldNo('DUE_TESTING', 'KG35_A')).toBe(73);
    expect(cylinderFieldNo('DUE_TESTING', 'KG35_B')).toBe(75);
    expect(CYLINDER_SIZES.filter((s) => s.startsWith('KG35'))).toHaveLength(2);
  });

  it('maps percentages to AVERAGE and MT/counts to SUM (spec mapping)', () => {
    const avg = MONTHLY_SUMMARY_ITEMS.filter((i) => i.agg === 'avg').map((i) => i.no);
    expect(avg).toEqual([20, 21, 22, 23, 24]);
    const kindsOfAverages = MONTHLY_SUMMARY_ITEMS.filter((i) => i.no >= 20 && i.no <= 24).map(
      (i) => i.kind,
    );
    expect(new Set(kindsOfAverages)).toEqual(new Set(['percent']));
  });
});

describe('Daily Exception lines', () => {
  it('has 13 lines with answer fields numbered as in the spec', () => {
    expect(DAILY_EXCEPTION_LINES.map((l) => l.answerNo)).toEqual([
      5, 7, 9, 13, 23, 26, 28, 31, 33, 37, 39, 42, 45,
    ]);
  });

  it('numbers detail fields 6–46 with no gaps or repeats (answers included)', () => {
    const nos = DAILY_EXCEPTION_LINES.flatMap((l) => [l.answerNo, ...l.details.map((d) => d.no)]);
    expect([...nos].sort((a, b) => a - b)).toEqual(Array.from({ length: 42 }, (_, i) => i + 5));
  });

  it('lines with extra numbers/dropdowns are exactly 3, 4, 5, 7, 9, 11, 12; line 13 is the incident', () => {
    const structured = DAILY_EXCEPTION_LINES.filter((l) =>
      l.details.some((d) => d.key !== 'remarks'),
    ).map((l) => l.lineNo);
    expect(structured).toEqual([3, 4, 5, 7, 9, 11, 12]);
    expect(DAILY_EXCEPTION_LINES.find((l) => 'incident' in l)?.lineNo).toBe(13);
  });
});
