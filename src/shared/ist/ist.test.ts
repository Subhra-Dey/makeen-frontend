import {
  addDays,
  daysBetween,
  financialYearOf,
  financialYearRange,
  formatDate,
  formatDateTimeIst,
  formatInstantDate,
  formatMonthYear,
  hoursBetween,
  isFutureIstDate,
  isFutureIstMonth,
  isIsoDate,
  istCurrentMonth,
  istStartOfDay,
  istToday,
  lastDayOfMonth,
  parseDisplayDate,
} from './index';

describe('istToday around midnight IST (UTC+05:30)', () => {
  it('is still the 15th one second before IST midnight', () => {
    expect(istToday(new Date('2026-10-15T18:29:59Z'))).toBe('2026-10-15');
  });
  it('becomes the 16th exactly at IST midnight', () => {
    expect(istToday(new Date('2026-10-15T18:30:00Z'))).toBe('2026-10-16');
  });
  it('is already the next day while UTC is still on the previous day', () => {
    expect(istToday(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01');
  });
});

describe('future-date checks (UXV-7)', () => {
  const now = new Date('2026-10-15T18:30:00Z'); // 16-10-2026 00:00 IST
  it('today is not future', () => {
    expect(isFutureIstDate('2026-10-16', now)).toBe(false);
  });
  it('tomorrow is future', () => {
    expect(isFutureIstDate('2026-10-17', now)).toBe(true);
  });
  it('a date that is "today" in UTC but yesterday in IST is not future', () => {
    expect(isFutureIstDate('2026-10-15', now)).toBe(false);
  });
  it('rejects invalid dates', () => {
    expect(() => isFutureIstDate('2026-02-30', now)).toThrow(RangeError);
  });
  it('month checks use the IST month', () => {
    const lateOct31Utc = new Date('2026-10-31T19:00:00Z'); // 01-11-2026 00:30 IST
    expect(istCurrentMonth(lateOct31Utc)).toBe('2026-11');
    expect(isFutureIstMonth('2026-11', lateOct31Utc)).toBe(false);
    expect(isFutureIstMonth('2026-12', lateOct31Utc)).toBe(true);
  });
});

describe('calendar helpers', () => {
  it('validates real calendar dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('15-10-2026')).toBe(false);
  });
  it('istStartOfDay is 18:30 UTC of the previous day', () => {
    expect(istStartOfDay('2026-10-16').toISOString()).toBe('2026-10-15T18:30:00.000Z');
  });
  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('counts days between dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-16')).toBe(15);
  });
  it('knows month lengths', () => {
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29');
    expect(lastDayOfMonth('2026-09')).toBe('2026-09-30');
  });
});

describe('display formats (TIME-2)', () => {
  it('formats dates dd-mm-yyyy', () => {
    expect(formatDate('2026-10-15')).toBe('15-10-2026');
  });
  it('formats instants in IST', () => {
    const at = new Date('2026-10-15T15:35:00Z');
    expect(formatDateTimeIst(at)).toBe('15-10-2026, 21:05 IST');
    expect(formatInstantDate(new Date('2026-10-15T19:00:00Z'))).toBe('16-10-2026');
  });
  it('formats months', () => {
    expect(formatMonthYear('2026-10')).toBe('October 2026');
    expect(formatMonthYear('2026-09-14')).toBe('September 2026');
  });
  it('parses display dates', () => {
    expect(parseDisplayDate('15-10-2026')).toBe('2026-10-15');
    expect(parseDisplayDate('31-02-2026')).toBeNull();
    expect(parseDisplayDate('2026-10-15')).toBeNull();
  });
});

describe('financial year (April–March)', () => {
  it('labels dates', () => {
    expect(financialYearOf('2026-10-15')).toBe('2026-27');
    expect(financialYearOf('2026-04-01')).toBe('2026-27');
    expect(financialYearOf('2026-03-31')).toBe('2025-26');
    expect(financialYearOf('2099-12-31')).toBe('2099-00');
  });
  it('gives the range of a label', () => {
    expect(financialYearRange('2026-27')).toEqual({ start: '2026-04-01', end: '2027-03-31' });
    expect(() => financialYearRange('2026-28')).toThrow(RangeError);
  });
});

describe('hoursBetween', () => {
  it('measures elapsed hours and never goes negative', () => {
    expect(hoursBetween(new Date('2026-10-15T00:00:00Z'), new Date('2026-10-16T06:00:00Z'))).toBe(
      30,
    );
    expect(hoursBetween(new Date('2026-10-16T00:00:00Z'), new Date('2026-10-15T00:00:00Z'))).toBe(
      0,
    );
  });
});
