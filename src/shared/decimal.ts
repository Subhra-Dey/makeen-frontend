// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

/**
 * Exact fixed-point arithmetic for MT / Rs. / % values (no JS floats — CLAUDE.md).
 * Values travel as decimal strings (Prisma Decimal → string). Internally they are scaled BigInts.
 */

export type DecimalInput = string | number | null | undefined;

// Linear pattern (no nested quantifiers) — not vulnerable to ReDoS.
// eslint-disable-next-line security/detect-unsafe-regex
const DECIMAL_RE = /^([+-])?(\d+)(?:\.(\d+))?$/;

/** Parse to a BigInt scaled by 10^scale. null/undefined/'' → null. Rejects extra non-zero precision. */
export function toScaled(value: DecimalInput, scale: number): bigint | null {
  if (value === null || value === undefined || value === '') return null;
  const text = typeof value === 'number' ? value.toFixed(scale) : value.trim();
  const m = DECIMAL_RE.exec(text);
  if (!m) throw new RangeError(`Not a decimal number: ${text}`);
  const frac = m[3] ?? '';
  if (frac.length > scale && /[1-9]/.test(frac.slice(scale))) {
    throw new RangeError(`Too many decimals (max ${scale}): ${text}`);
  }
  const digits = BigInt((m[2] ?? '0') + frac.padEnd(scale, '0').slice(0, scale));
  return m[1] === '-' ? -digits : digits;
}

/** Scaled BigInt → plain decimal string with exactly `scale` decimals (no negative zero). */
export function fromScaled(value: bigint, scale: number): string {
  const negative = value < 0n;
  const abs = (negative ? -value : value).toString().padStart(scale + 1, '0');
  const whole = abs.slice(0, abs.length - scale);
  const frac = scale > 0 ? `.${abs.slice(abs.length - scale)}` : '';
  return `${negative && value !== 0n ? '-' : ''}${whole}${frac}`;
}

/** Sum decimal values (null counts as 0). */
export function sumDecimals(values: readonly DecimalInput[], scale: number): string {
  let total = 0n;
  for (const v of values) total += toScaled(v, scale) ?? 0n;
  return fromScaled(total, scale);
}

/** a + b − c … with null treated as 0. */
export function addDecimals(scale: number, ...values: DecimalInput[]): string {
  return sumDecimals(values, scale);
}

export function subtractDecimals(a: DecimalInput, b: DecimalInput, scale: number): string {
  return fromScaled((toScaled(a, scale) ?? 0n) - (toScaled(b, scale) ?? 0n), scale);
}

/** Average of the non-null values, rounded half away from zero; '0.00…' when there are none. */
export function averageDecimals(values: readonly DecimalInput[], scale: number): string {
  let total = 0n;
  let count = 0n;
  for (const v of values) {
    const s = toScaled(v, scale);
    if (s !== null) {
      total += s;
      count += 1n;
    }
  }
  if (count === 0n) return fromScaled(0n, scale);
  const negative = total < 0n;
  const abs = negative ? -total : total;
  const rounded = (abs * 2n + count) / (count * 2n);
  return fromScaled(negative ? -rounded : rounded, scale);
}

/** Sum of integers (null counts as 0). */
export function sumInts(values: readonly (number | null | undefined)[]): number {
  let total = 0;
  for (const v of values) {
    if (v !== null && v !== undefined) {
      if (!Number.isInteger(v)) throw new RangeError(`Not an integer: ${String(v)}`);
      total += v;
    }
  }
  return total;
}
