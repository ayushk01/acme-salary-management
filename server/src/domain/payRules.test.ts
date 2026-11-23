import { describe, expect, it } from 'vitest';

import {
  MIN_GROUP_SIZE,
  OUTLIER_THRESHOLD_PERCENT,
  isGroupLargeEnough,
  isOutsideRange,
} from './payRules.js';

// A median of 10,000.00 in minor units. 25% above is 12,500.00 and 25%
// below is 7,500.00, so the boundaries land on whole minor units and the
// cases below are exact rather than approximate.
const MEDIAN = 1_000_000;

describe('isOutsideRange', () => {
  it('is false for a salary sitting exactly on the median', () => {
    expect(isOutsideRange(MEDIAN, MEDIAN)).toBe(false);
  });

  it('is false for a salary exactly the threshold above the median', () => {
    expect(isOutsideRange(1_250_000, MEDIAN)).toBe(false);
  });

  it('is true for a salary one minor unit past the threshold above', () => {
    expect(isOutsideRange(1_250_001, MEDIAN)).toBe(true);
  });

  it('is false for a salary exactly the threshold below the median', () => {
    expect(isOutsideRange(750_000, MEDIAN)).toBe(false);
  });

  it('is true for a salary one minor unit past the threshold below', () => {
    expect(isOutsideRange(749_999, MEDIAN)).toBe(true);
  });

  it('accepts a different threshold so the rule can be changed in one place', () => {
    expect(isOutsideRange(1_100_000, MEDIAN, 10)).toBe(false);
    expect(isOutsideRange(1_100_001, MEDIAN, 10)).toBe(true);
  });
});

describe('isGroupLargeEnough', () => {
  it('is false for a group below the minimum size', () => {
    expect(isGroupLargeEnough(4)).toBe(false);
  });

  it('is true for a group at the minimum size', () => {
    expect(isGroupLargeEnough(5)).toBe(true);
  });
});

describe('the published thresholds', () => {
  it('are the values the SQL is given as bound parameters', () => {
    expect(OUTLIER_THRESHOLD_PERCENT).toBe(25);
    expect(MIN_GROUP_SIZE).toBe(5);
  });
});
