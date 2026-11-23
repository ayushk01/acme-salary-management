import { describe, expect, it } from 'vitest';

import { formatMoney, localeForCountry, minorUnitsToDecimalString } from './money.js';

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

describe('localeForCountry', () => {
  it('keeps the Indian grouping for India', () => {
    expect(
      plainSpaces(
        formatMoney(
          { amountMinor: 180_000_000, currency: 'INR', minorUnit: 2 },
          localeForCountry('IN'),
        ),
      ),
    ).toBe('₹18,00,000.00');
  });

  it('groups every other country in thousands', () => {
    expect(
      plainSpaces(
        formatMoney(
          { amountMinor: 14_000_000, currency: 'USD', minorUnit: 2 },
          localeForCountry('US'),
        ),
      ),
    ).toBe('$140,000.00');
  });

  // Three of our countries use a dollar. Formatted in their own locale all
  // three render as a bare "$", which is unreadable side by side.
  it('keeps Singapore dollars distinct from US dollars', () => {
    expect(
      plainSpaces(
        formatMoney(
          { amountMinor: 11_000_000, currency: 'SGD', minorUnit: 2 },
          localeForCountry('SG'),
        ),
      ),
    ).toBe('SGD 110,000.00');
  });

  it('shows yen with its symbol and no decimal places', () => {
    expect(
      plainSpaces(
        formatMoney(
          { amountMinor: 8_000_000, currency: 'JPY', minorUnit: 0 },
          localeForCountry('JP'),
        ),
      ),
    ).toBe('¥8,000,000');
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
