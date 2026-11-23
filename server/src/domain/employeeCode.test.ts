import { describe, expect, it } from 'vitest';

import { formatEmployeeCode } from './employeeCode.js';

describe('formatEmployeeCode', () => {
  it('pads the first employee number to five digits', () => {
    expect(formatEmployeeCode(1)).toBe('EMP00001');
  });

  it('leaves a five digit number unpadded', () => {
    expect(formatEmployeeCode(10000)).toBe('EMP10000');
  });

  it('rejects a number below one', () => {
    expect(() => formatEmployeeCode(0)).toThrow('Employee number must be a positive integer');
  });

  it('rejects a number that is not whole', () => {
    expect(() => formatEmployeeCode(1.5)).toThrow('Employee number must be a positive integer');
  });
});
