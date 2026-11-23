/**
 * Minor units to a decimal string, using only integer and string operations.
 *
 * Deliberately a copy of the same function in `web/src/money.ts`. A shared
 * workspace for fifteen lines would mean another package, another tsconfig
 * and two different module resolutions to satisfy, which costs more than it
 * saves. The honest downside is that the two could drift apart without a
 * test noticing, so each has its own tests and this comment points at the
 * other.
 *
 * Dividing by 100 would be the obvious implementation and the one that
 * quietly loses money.
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

  return `${sign}${padded.slice(0, -minorUnit)}.${padded.slice(-minorUnit)}`;
}
