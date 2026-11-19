import {
  formatCount,
  formatMt,
  formatNumber,
  formatPercent,
  maskAadhaar,
  maskEmail,
  maskPhone,
  roundDecimalString,
} from './index';

describe('roundDecimalString', () => {
  it('rounds half away from zero without float error', () => {
    expect(roundDecimalString('1.005', 2)).toBe('1.01');
    expect(roundDecimalString('-1.005', 2)).toBe('-1.01');
    expect(roundDecimalString('368.5504', 3)).toBe('368.550');
    expect(roundDecimalString('9.9995', 3)).toBe('10.000');
  });
  it('pads and avoids negative zero', () => {
    expect(roundDecimalString('12', 3)).toBe('12.000');
    expect(roundDecimalString('-0.0001', 3)).toBe('0.000');
  });
  it('rejects non-numbers', () => {
    expect(() => roundDecimalString('1e5', 2)).toThrow(RangeError);
  });
});

describe('en-IN formatting', () => {
  it('groups lakhs and crores', () => {
    expect(formatNumber('412800', 2)).toBe('4,12,800.00');
    expect(formatNumber('123456789', 0)).toBe('12,34,56,789');
    expect(formatNumber('999', 0)).toBe('999');
    expect(formatNumber('1000', 0)).toBe('1,000');
  });
  it('formats MT with 3 decimals, % with 2', () => {
    expect(formatMt('412.38')).toBe('412.380');
    expect(formatMt('-0.12')).toBe('-0.120');
    expect(formatPercent('62.4')).toBe('62.40');
    expect(formatCount(14200)).toBe('14,200');
  });
  it('accepts JS numbers', () => {
    expect(formatMt(368.43)).toBe('368.430');
  });
});

describe('masking', () => {
  it('masks phone as in the spec', () => {
    expect(maskPhone('9812345621')).toBe('98XXXXXX21');
    expect(maskPhone('+91 98123 45621')).toBe('98XXXXXX21');
  });
  it('masks email as in the spec', () => {
    expect(maskEmail('anita.sharma@makeenenergy.com')).toBe('an***@makeenenergy.com');
  });
  it('masks Aadhaar', () => {
    expect(maskAadhaar('4821')).toBe('XXXX-XXXX-4821');
    expect(() => maskAadhaar('48')).toThrow(RangeError);
  });
});
