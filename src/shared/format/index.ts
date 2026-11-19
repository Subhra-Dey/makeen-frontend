// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.
/**
 * Display formatting for India (TIME-2) and masking of KEKA contact data (SEC-12).
 * Decimal values arrive from the API as strings (Prisma Decimal → string) and are formatted
 * without passing through JS floats.
 */

// Linear pattern (no nested quantifiers) — not vulnerable to ReDoS; the plugin flags any optional group.
// eslint-disable-next-line security/detect-unsafe-regex
const DECIMAL_RE = /^([+-])?(\d+)(?:\.(\d+))?$/;

/** Round a decimal string half away from zero to `decimals` places. Returns a plain decimal string. */
export function roundDecimalString(value: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 20) {
    throw new RangeError(`decimals must be an integer 0–20, got ${decimals}`);
  }
  const m = DECIMAL_RE.exec(value.trim());
  if (!m) throw new RangeError(`Not a decimal number: ${value}`);
  const negative = m[1] === '-';
  const intPart = m[2] ?? '0';
  const frac = m[3] ?? '';
  const kept = frac.padEnd(decimals, '0').slice(0, decimals);
  let scaled = BigInt(intPart + kept);
  const nextDigit = frac.charAt(decimals);
  if (nextDigit !== '' && nextDigit >= '5') scaled += 1n;

  const digits = scaled.toString().padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals > 0 ? digits.slice(digits.length - decimals) : '';
  const isZero = scaled === 0n;
  const sign = negative && !isZero ? '-' : '';
  return decimals > 0 ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

/** Indian digit grouping of a non-negative integer string: 412800 → 4,12,800. */
function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3);
  const groups: string[] = [];
  for (let i = rest.length; i > 0; i -= 2) {
    groups.unshift(rest.slice(Math.max(0, i - 2), i));
  }
  return `${groups.join(',')},${last3}`;
}

function toDecimalString(value: string | number): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new RangeError(`Not a finite number: ${value}`);
    return value.toFixed(12);
  }
  return value;
}

/** en-IN formatting with fixed decimals, e.g. formatNumber('412800', 2) → '4,12,800.00'. */
export function formatNumber(value: string | number, decimals: number): string {
  const rounded = roundDecimalString(toDecimalString(value), decimals);
  const negative = rounded.startsWith('-');
  const body = negative ? rounded.slice(1) : rounded;
  const [whole = '0', fraction] = body.split('.');
  const grouped = groupIndian(whole);
  return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
}

/** Metric tonnes: always 3 decimals. */
export const formatMt = (value: string | number): string => formatNumber(value, 3);
/** Percentages: always 2 decimals (no % sign; the column header carries the unit). */
export const formatPercent = (value: string | number): string => formatNumber(value, 2);
/** Rupees: 2 decimals. */
export const formatRupees = (value: string | number): string => formatNumber(value, 2);
/** Counts and minutes: integer with grouping. */
export const formatCount = (value: string | number): string => formatNumber(value, 0);

/** `98XXXXXX21` — first two and last two digits of the 10-digit mobile number. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length < 4) return 'XXXXXXXXXX';
  return `${digits.slice(0, 2)}${'X'.repeat(digits.length - 4)}${digits.slice(-2)}`;
}

/** `an***@makeenenergy.com`. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  return `${local.slice(0, Math.min(2, local.length))}***${email.slice(at)}`;
}

/** `XXXX-XXXX-1234` from the stored last four digits. */
export function maskAadhaar(last4: string): string {
  if (!/^\d{4}$/.test(last4)) throw new RangeError('Aadhaar last4 must be 4 digits');
  return `XXXX-XXXX-${last4}`;
}
