const PREFIX = 'EMP';
const DIGITS = 5;

/**
 * Employee codes are what HR uses to identify a person, because at 10,000
 * people full names are not unique. Five digits covers the current headcount
 * with room to spare; a longer number simply produces a longer code.
 */
export function formatEmployeeCode(employeeNumber: number): string {
  if (!Number.isInteger(employeeNumber) || employeeNumber < 1) {
    throw new Error('Employee number must be a positive integer');
  }

  return `${PREFIX}${String(employeeNumber).padStart(DIGITS, '0')}`;
}
