// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.
/**
 * India time utilities — the only place that knows about Asia/Kolkata (spec BEV-7, TIME-1).
 *
 * Conventions:
 * - Instants are JS `Date` (UTC under the hood; stored as timestamptz).
 * - Business dates are ISO strings `yyyy-MM-dd` (stored as `date`), typed `IsoDate`.
 * - Months are ISO strings `yyyy-MM` (stored as the first day of the month), typed `IsoMonth`.
 */
import { format as formatDateFns } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const IST_TIME_ZONE = 'Asia/Kolkata';

/** Business date `yyyy-MM-dd`. */
export type IsoDate = string;
/** Business month `yyyy-MM`. */
export type IsoMonth = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH_RE = /^(\d{4})-(\d{2})$/;
const DISPLAY_DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/** True when `value` is a real calendar date in `yyyy-MM-dd` form. */
export function isIsoDate(value: string): boolean {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** True when `value` is a real month in `yyyy-MM` form. */
export function isIsoMonth(value: string): boolean {
  const m = ISO_MONTH_RE.exec(value);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

function assertIsoDate(value: string): void {
  if (!isIsoDate(value)) throw new RangeError(`Invalid ISO date: ${value}`);
}

/** Today's calendar date in India. */
export function istToday(now: Date = new Date()): IsoDate {
  return formatInTimeZone(now, IST_TIME_ZONE, 'yyyy-MM-dd');
}

/** Current month in India. */
export function istCurrentMonth(now: Date = new Date()): IsoMonth {
  return formatInTimeZone(now, IST_TIME_ZONE, 'yyyy-MM');
}

/** Spec UXV-7: a date after today (India) is a future date. */
export function isFutureIstDate(date: IsoDate, now: Date = new Date()): boolean {
  assertIsoDate(date);
  return date > istToday(now);
}

/** Monthly MIS: a month after the current India month is in the future. */
export function isFutureIstMonth(month: IsoMonth, now: Date = new Date()): boolean {
  if (!isIsoMonth(month)) throw new RangeError(`Invalid ISO month: ${month}`);
  return month > istCurrentMonth(now);
}

/** The instant at which `date` begins in India (00:00 IST). */
export function istStartOfDay(date: IsoDate): Date {
  assertIsoDate(date);
  return fromZonedTime(`${date}T00:00:00`, IST_TIME_ZONE);
}

/** Calendar-date arithmetic (no time zone involved). */
export function addDays(date: IsoDate, days: number): IsoDate {
  assertIsoDate(date);
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Number of calendar days from `from` to `to` (to − from). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((istStartOfDay(to).getTime() - istStartOfDay(from).getTime()) / 86_400_000);
}

/** The month a date belongs to. */
export function monthOf(date: IsoDate): IsoMonth {
  assertIsoDate(date);
  return date.slice(0, 7);
}

/** First day of a month, as the business date stored in `monthly_mis.month`. */
export function firstDayOfMonth(month: IsoMonth): IsoDate {
  if (!isIsoMonth(month)) throw new RangeError(`Invalid ISO month: ${month}`);
  return `${month}-01`;
}

/** Last day of a month. */
export function lastDayOfMonth(month: IsoMonth): IsoDate {
  if (!isIsoMonth(month)) throw new RangeError(`Invalid ISO month: ${month}`);
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${month}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
}

/** `15-10-2026` from `2026-10-15`. */
export function formatDate(date: IsoDate): string {
  assertIsoDate(date);
  const [y, m, d] = date.split('-');
  return `${d ?? ''}-${m ?? ''}-${y ?? ''}`;
}

/** Calendar date (India) of an instant, formatted `dd-mm-yyyy`. */
export function formatInstantDate(instant: Date): string {
  return formatInTimeZone(instant, IST_TIME_ZONE, 'dd-MM-yyyy');
}

/** `15-10-2026, 21:05 IST`. */
export function formatDateTimeIst(instant: Date): string {
  return `${formatInTimeZone(instant, IST_TIME_ZONE, 'dd-MM-yyyy, HH:mm')} IST`;
}

/** `October 2026` from `2026-10` or `2026-10-15`. */
/** Accepts an `IsoMonth` or an `IsoDate`. */
export function formatMonthYear(value: string): string {
  const month = value.length === 7 ? value : monthOf(value);
  if (!isIsoMonth(month)) throw new RangeError(`Invalid ISO month: ${value}`);
  const [y, m] = month.split('-').map(Number) as [number, number];
  return formatDateFns(new Date(y, m - 1, 1), 'MMMM yyyy');
}

/** Parses the display form `dd-mm-yyyy`; returns null when not a real date. */
export function parseDisplayDate(value: string): IsoDate | null {
  const m = DISPLAY_DATE_RE.exec(value.trim());
  if (!m) return null;
  const iso = `${m[3] ?? ''}-${m[2] ?? ''}-${m[1] ?? ''}`;
  return isIsoDate(iso) ? iso : null;
}

/** Indian financial year label (April–March), e.g. `2026-27` for 2026-10-15 and `2025-26` for 2026-03-31. */
export function financialYearOf(date: IsoDate): string {
  assertIsoDate(date);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

const FY_RE = /^(\d{4})-(\d{2})$/;

/** Date range of an FY label: `2026-27` → 2026-04-01 … 2027-03-31. */
export function financialYearRange(fy: string): { start: IsoDate; end: IsoDate } {
  const m = FY_RE.exec(fy);
  const start = Number(m?.[1]);
  if (!m || (start + 1) % 100 !== Number(m[2]))
    throw new RangeError(`Invalid financial year: ${fy}`);
  return { start: `${start}-04-01`, end: `${start + 1}-03-31` };
}

/** Elapsed hours between two instants (used for waiting hours). Never negative. */
export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);
}
