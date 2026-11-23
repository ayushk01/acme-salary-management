import { describe, expect, it } from 'vitest';

import { formatMoney, minorUnitsToDecimalString } from './money.js';

/**
 * ICU separates currency symbols with non-breaking spaces, which are
 * invisible in a diff and make an assertion fail for no useful reason.
 * Flattening every kind of whitespace to a plain space keeps the
 * expectations readable.
 */
const plainSpaces = (value: string): string => value.replace(/\s/g, ' ');

describe('minorUnitsToDecimalString', () => {
  it('places the decimal point for a two digit minor unit', () => {
    expect(minorUnitsToDecimalString(1_250_000, 2)).toBe('12500.00');
  });

  it('pads an amount smaller than one major unit', () => {
    expect(minorUnitsToDecimalString(5, 2)).toBe('0.05');
  });

  it('keeps a leading zero inside the fraction', () => {
    expect(minorUnitsToDecimalString(1205, 2)).toBe('12.05');
  });

  it('adds no decimal point for a currency without minor units', () => {
    expect(minorUnitsToDecimalString(1_250_000, 0)).toBe('1250000');
  });

  it('keeps the sign in front of a negative amount', () => {
    expect(minorUnitsToDecimalString(-1205, 2)).toBe('-12.05');
  });

  it('rejects an amount that is not a whole number of minor units', () => {
    expect(() => minorUnitsToDecimalString(12.5, 2)).toThrow(
      'Amount must be a whole number of minor units',
    );
  });
});

describe('formatMoney', () => {
  it('groups rupees the Indian way, not in thousands', () => {
    // 12,50,000.00 rupees: a realistic annual salary, and large enough that
    // Indian grouping (2,2,3) differs visibly from Western grouping.
    const formatted = formatMoney(
      { amountMinor: 125_000_000, currency: 'INR', minorUnit: 2 },
      'en-IN',
    );

    expect(plainSpaces(formatted)).toBe('₹12,50,000.00');
  });

  it('shows no decimal places for a currency without minor units', () => {
    const formatted = formatMoney(
      { amountMinor: 1_250_000, currency: 'JPY', minorUnit: 0 },
      'en-US',
    );

    expect(plainSpaces(formatted)).toBe('¥1,250,000');
  });
});
