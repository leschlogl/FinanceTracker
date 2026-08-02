import { formatCurrency, minorUnitsToInputValue, parseAmountInput } from '../currency';

describe('parseAmountInput', () => {
  it('parses a plain decimal amount into minor units', () => {
    expect(parseAmountInput('12.99')).toBe(1299);
  });

  it('parses a whole-number amount into minor units', () => {
    expect(parseAmountInput('12')).toBe(1200);
  });

  it('trims surrounding whitespace', () => {
    expect(parseAmountInput('  12.99  ')).toBe(1299);
  });

  it('accepts a comma as the decimal separator', () => {
    expect(parseAmountInput('12,50')).toBe(1250);
  });

  it('rounds amounts with more than two decimal places', () => {
    expect(parseAmountInput('12.999')).toBe(1300);
  });

  it('handles a trailing decimal point with no digits after it', () => {
    expect(parseAmountInput('12.')).toBe(1200);
  });

  it('avoids float-precision drift on values like 19.99', () => {
    expect(parseAmountInput('19.99')).toBe(1999);
  });

  it('returns null for an empty string', () => {
    expect(parseAmountInput('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(parseAmountInput('   ')).toBeNull();
  });

  it('returns null for a negative amount', () => {
    expect(parseAmountInput('-5')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseAmountInput('0')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseAmountInput('abc')).toBeNull();
  });

  it('returns null for a mixed numeric/non-numeric string', () => {
    expect(parseAmountInput('12.99abc')).toBeNull();
  });

  it('returns null for multiple decimal points', () => {
    expect(parseAmountInput('12.9.9')).toBeNull();
  });

  it('returns null for a value with a leading dot and no digit before it', () => {
    expect(parseAmountInput('.99')).toBeNull();
  });
});

describe('minorUnitsToInputValue', () => {
  it('formats minor units as a two-decimal-place string', () => {
    expect(minorUnitsToInputValue(1299)).toBe('12.99');
  });

  it('formats whole-euro amounts with trailing zeros', () => {
    expect(minorUnitsToInputValue(1200)).toBe('12.00');
  });

  it('formats amounts under one major unit', () => {
    expect(minorUnitsToInputValue(50)).toBe('0.50');
  });

  it('round-trips through parseAmountInput', () => {
    expect(parseAmountInput(minorUnitsToInputValue(1299))).toBe(1299);
  });
});

describe('formatCurrency', () => {
  it('formats minor units as a localized EUR string', () => {
    expect(formatCurrency(1299, 'EUR', 'en-US')).toBe('€12.99');
  });

  it('formats minor units as a localized USD string', () => {
    expect(formatCurrency(1299, 'USD', 'en-US')).toBe('$12.99');
  });

  it('formats using the given locale', () => {
    expect(formatCurrency(1299, 'EUR', 'de-DE')).toBe('12,99 €');
  });
});
