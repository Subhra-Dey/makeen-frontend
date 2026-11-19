import {
  addDecimals,
  averageDecimals,
  fromScaled,
  subtractDecimals,
  sumDecimals,
  sumInts,
  toScaled,
} from './decimal';

describe('fixed-point decimals', () => {
  it('parses and formats exactly', () => {
    expect(toScaled('412.38', 3)).toBe(412380n);
    expect(toScaled('-0.12', 3)).toBe(-120n);
    expect(toScaled(null, 3)).toBeNull();
    expect(toScaled('', 3)).toBeNull();
    expect(fromScaled(368550n, 3)).toBe('368.550');
    expect(fromScaled(-120n, 3)).toBe('-0.120');
    expect(fromScaled(0n, 2)).toBe('0.00');
  });

  it('rejects more precision than the column allows', () => {
    expect(() => toScaled('1.0004', 3)).toThrow(RangeError);
    expect(toScaled('1.2000', 3)).toBe(1200n);
  });

  it('adds without float error (0.1 + 0.2)', () => {
    expect(addDecimals(3, '0.1', '0.2')).toBe('0.300');
    expect(sumDecimals(['198.420', '12.000', '14.260', null], 3)).toBe('224.680');
    expect(subtractDecimals('368.430', '368.550', 3)).toBe('-0.120');
  });

  it('averages non-null values with half-up rounding', () => {
    expect(averageDecimals(['62.40', '61.20'], 2)).toBe('61.80');
    expect(averageDecimals(['1.00', '1.00', '2.00'], 2)).toBe('1.33');
    expect(averageDecimals(['1.00', '2.00', null], 2)).toBe('1.50');
    expect(averageDecimals([], 2)).toBe('0.00');
  });

  it('sums integers and refuses fractions', () => {
    expect(sumInts([15, 0, 10, null, 20, undefined, 5])).toBe(50);
    expect(() => sumInts([1.5])).toThrow(RangeError);
  });
});
