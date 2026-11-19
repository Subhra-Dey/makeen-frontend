// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import { addDays, istToday } from '../ist';
import {
  HIGHLIGHT_MAX,
  allAnswered,
  cleanLines,
  exceptionStatus,
  problemHighlight,
  type ExceptionLines,
} from '../rules/daily-exception';
import {
  DAILY_EXCEPTION_MESSAGES,
  dailyExceptionQuerySchema,
  dailyExceptionSaveSchema,
  lapseNoteSchema,
} from './daily-exception';
import { FIELD_MESSAGES } from './field-values';

const PLANT = '0190a000-0000-7000-8000-000000000001';

function issues(r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries((r.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));
}

/** All 13 lines No, with overrides. */
function lines(over: Record<string, { answer: 'YES' | 'NO' | null; details?: object }> = {}) {
  const out: Record<string, { answer: 'YES' | 'NO' | null; details: object }> = {};
  for (let n = 1; n <= 13; n += 1) {
    const o = over[String(n)];
    out[String(n)] = { answer: o ? o.answer : 'NO', details: o?.details ?? {} };
  }
  return out;
}

const base = { plantId: PLANT, reportDate: '2026-10-16', plantStatus: 'OPERATIONAL' as const };

describe('dailyExceptionSaveSchema', () => {
  it('a Draft may be incomplete', () => {
    const r = dailyExceptionSaveSchema.safeParse({
      ...base,
      action: 'draft',
      plantStatus: null,
      lines: { '1': { answer: 'YES', details: {} } },
    });
    expect(r.success).toBe(true);
  });

  it('Submit needs the plant status and all 13 answers', () => {
    const r = dailyExceptionSaveSchema.safeParse({
      ...base,
      action: 'submit',
      plantStatus: null,
      lines: { ...lines(), '7': { answer: null } },
    });
    const m = issues(r);
    expect(m['plantStatus']).toBe(DAILY_EXCEPTION_MESSAGES.plantStatusRequired);
    expect(m['lines.7.answer']).toBe(DAILY_EXCEPTION_MESSAGES.answerRequired);
  });

  it('a Yes needs its Remarks; an incident needs its description (UXV-9)', () => {
    const r = dailyExceptionSaveSchema.safeParse({
      ...base,
      action: 'submit',
      lines: lines({ '1': { answer: 'YES' }, '13': { answer: 'YES', details: { remarks: ' ' } } }),
    });
    const m = issues(r);
    expect(m['lines.1.details.remarks']).toBe(DAILY_EXCEPTION_MESSAGES.remarksRequired);
    expect(m['lines.13.details.remarks']).toBe(DAILY_EXCEPTION_MESSAGES.incidentRequired);
  });

  it('a Yes on line 3 / 4 needs every extra field it shows (tank levels follow the count)', () => {
    const r = dailyExceptionSaveSchema.safeParse({
      ...base,
      action: 'submit',
      lines: lines({
        '3': { answer: 'YES', details: { jockeyPump1: 'AUTO' } },
        '4': {
          answer: 'YES',
          details: {
            tankCount: '2',
            tankCapacityKl: '500',
            tankHeightM: '12',
            tankDiameterM: '8',
            tank1LevelM: '11.5',
            min4hRequirementKl: '400',
            pumpableWaterKl: '900',
          },
        },
      }),
    });
    const m = issues(r);
    expect(m['lines.3.details.jockeyPump2']).toBe(DAILY_EXCEPTION_MESSAGES.detailRequired);
    expect(m['lines.3.details.jockeyRuns24h']).toBe(DAILY_EXCEPTION_MESSAGES.detailRequired);
    expect(m['lines.4.details.tank2LevelM']).toBe(DAILY_EXCEPTION_MESSAGES.detailRequired);
    expect(m).not.toHaveProperty('lines.4.details.tank3LevelM');
  });

  it('validates the extra fields by type and drops unknown keys (DEX-R7)', () => {
    const r = dailyExceptionSaveSchema.safeParse({
      ...base,
      action: 'draft',
      lines: {
        '3': { answer: 'YES', details: { jockeyPump1: 'SOMETIMES', jockeyRuns24h: '-2' } },
        '11': { answer: 'YES', details: { cylinderType: '14.2', sqcAverageResult: '12.345' } },
      },
    });
    const m = issues(r);
    expect(m['lines.3.details.jockeyPump1']).toBe(FIELD_MESSAGES.option);
    expect(m['lines.3.details.jockeyRuns24h']).toBe(FIELD_MESSAGES.negative);
    expect(m['lines.11.details.sqcAverageResult']).toBe(FIELD_MESSAGES.decimals(2));
    const ok = dailyExceptionSaveSchema.parse({
      ...base,
      action: 'draft',
      lines: { '1': { answer: 'YES', details: { remarks: ' x ', hack: 'y' } } },
    });
    expect(ok.lines['1']?.details).toEqual({ remarks: 'x' });
  });

  it('refuses a future India date', () => {
    const r = dailyExceptionSaveSchema.safeParse({
      ...base,
      action: 'draft',
      reportDate: addDays(istToday(), 1),
    });
    expect(issues(r)['reportDate']).toBe(FIELD_MESSAGES.dateFuture);
  });
});

describe('Daily Exception rules', () => {
  const parse = (l: object): ExceptionLines =>
    cleanLines(dailyExceptionSaveSchema.parse({ ...base, action: 'draft', lines: l }).lines);

  it('No (or unanswered) clears the extra fields; tank levels follow the tank count (DEX-R6)', () => {
    const l = parse({
      '1': { answer: 'NO', details: { remarks: 'left over' } },
      '4': { answer: 'YES', details: { tankCount: '1', tank1LevelM: '9', tank2LevelM: '8' } },
    });
    expect(l['1']).toEqual({ answer: 'NO', details: {} });
    expect(l['4']?.details).toEqual({ tankCount: '1', tank1LevelM: '9.00' });
    expect(l['13']).toEqual({ answer: null, details: {} });
    expect(allAnswered(l)).toBe(false);
  });

  it('status: Draft → Partial; all No + Operational → Completed; Yes or Non-operational → Pending', () => {
    const clean = parse(lines());
    expect(allAnswered(clean)).toBe(true);
    expect(exceptionStatus('draft', 'OPERATIONAL', clean)).toBe('PARTIAL');
    expect(exceptionStatus('submit', 'OPERATIONAL', clean)).toBe('COMPLETED');
    expect(exceptionStatus('submit', 'NON_OPERATIONAL', clean)).toBe('PENDING');
    const yes = parse(lines({ '13': { answer: 'YES', details: { remarks: 'Leak' } } }));
    expect(exceptionStatus('submit', 'OPERATIONAL', yes)).toBe('PENDING');
  });

  it('highlight: first Yes line 1→12, then the incident; generated text for lines without Remarks (D-22)', () => {
    const a = parse(
      lines({
        '3': {
          answer: 'YES',
          details: { jockeyPump1: 'AUTO', jockeyPump2: 'MANUAL', jockeyRuns24h: 14 },
        },
        '6': { answer: 'YES', details: { remarks: 'ESD button 3 stuck' } },
        '13': { answer: 'YES', details: { remarks: 'Minor leak' } },
      }),
    );
    expect(problemHighlight('PENDING', 'OPERATIONAL', a)).toBe(
      'Line 3 — Jockey pump no. 1: Auto; Jockey pump no. 2: Manual; Total runs of jockey pump in last 24 hours: 14',
    );
    const b = parse(lines({ '13': { answer: 'YES', details: { remarks: 'Minor leak' } } }));
    expect(problemHighlight('PENDING', 'OPERATIONAL', b)).toBe('Incident: Minor leak');
    const c = parse(
      lines({
        '12': { answer: 'YES', details: { cameraTotal: 24, dsoObservation: 'Cam 7 down' } },
      }),
    );
    expect(problemHighlight('PENDING', 'OPERATIONAL', c)).toBe('Line 12 — Cam 7 down');
    expect(problemHighlight('PENDING', 'NON_OPERATIONAL', parse(lines()))).toBe(
      'Plant non-operational',
    );
    expect(problemHighlight('COMPLETED', 'OPERATIONAL', parse(lines()))).toBeNull();
    expect(problemHighlight('PARTIAL', 'OPERATIONAL', a)).toBeNull();
    const long = parse(lines({ '1': { answer: 'YES', details: { remarks: 'x'.repeat(500) } } }));
    expect(problemHighlight('PENDING', 'OPERATIONAL', long)?.length).toBe(HIGHLIGHT_MAX);
  });
});

describe('filters and lapse note', () => {
  it('accepts the Not initiated status and checks the range', () => {
    expect(dailyExceptionQuerySchema.safeParse({ status: 'NOT_INITIATED' }).success).toBe(true);
    expect(
      dailyExceptionQuerySchema.safeParse({ from: '2026-10-16', to: '2026-10-15' }).success,
    ).toBe(false);
  });

  it('a lapse note is short text for a past date', () => {
    expect(
      lapseNoteSchema.safeParse({ plantId: PLANT, date: '2026-10-15', note: ' ' }).success,
    ).toBe(false);
    expect(
      lapseNoteSchema.safeParse({ plantId: PLANT, date: '2026-10-15', note: 'Power shutdown' })
        .success,
    ).toBe(true);
  });
});
