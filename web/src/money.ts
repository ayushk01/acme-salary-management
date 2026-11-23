export interface Money {
  /** Whole number of minor units, e.g. paise for INR, yen for JPY. */
  amountMinor: number;
  /** ISO 4217 code, e.g. 'INR'. */
  currency: string;
  /** Decimal places the currency uses: 2 for INR, 0 for JPY. */
  minorUnit: number;
}

/**
 * Turns minor units into a decimal string using only integer and string
 * operations, so no amount is ever put through a float. Dividing by 100 here
 * would be the obvious implementation and the one that quietly loses money.
 */
export function minorUnitsToDecimalString(amountMinor: number, minorUnit: number): string {
  if (!Number.isInteger(amountMinor)) {
    throw new Error('Amount must be a whole number of minor units');
  }
  if (!Number.isInteger(minorUnit) || minorUnit < 0) {
    throw new Error('Minor unit must be a whole number of zero or more');
  }

  const sign = amountMinor < 0 ? '-' : '';
  const digits = String(Math.abs(amountMinor));

  if (minorUnit === 0) {
    return `${sign}${digits}`;
  }

  const padded = digits.padStart(minorUnit + 1, '0');
  const whole = padded.slice(0, -minorUnit);
  const fraction = padded.slice(-minorUnit);

  return `${sign}${whole}.${fraction}`;
}

/**
 * Formats money for display. Intl handles the per-locale grouping that HR
 * expects — Indian rupees group as 12,50,000 rather than 1,250,000 — and it
 * is given the decimal string rather than a number, so the integer amount
 * reaches the formatter intact.
 */
export function formatMoney(money: Money, locale: string): string {
  const decimal = minorUnitsToDecimalString(money.amountMinor, money.minorUnit);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: money.minorUnit,
    maximumFractionDigits: money.minorUnit,
    // minorUnitsToDecimalString always returns a plain numeric string, which
    // is exactly what Intl's string overload takes. TypeScript models that
    // parameter as a template literal type it cannot infer from a general
    // string, hence the assertion.
  }).format(decimal as Intl.StringNumericLiteral);
}
