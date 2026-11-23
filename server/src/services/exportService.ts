import type { AppDatabase } from '../db/connection.js';
import { UTF8_BOM, csvLine } from '../domain/csv.js';
import { minorUnitsToDecimalString } from '../domain/money.js';
import {
  type EmployeeFilters,
  findEmployeesForExport,
} from '../repositories/employeeRepository.js';

const HEADER = [
  'Employee code',
  'Full name',
  'Email',
  'Job title',
  'Department',
  'Country',
  'Salary',
  'Currency',
  'Status',
  'Hire date',
  'Last day',
];

/** Lines per write. Small enough to stay off the heap, large enough to be cheap. */
const CHUNK_LINES = 500;

/**
 * Writes the current filtered list as CSV.
 *
 * The salary is a plain number with the currency in its own column, so Excel
 * treats it as a number it can total and sort rather than as text. Its
 * decimal places come from the currency, which is why yen gets none.
 *
 * Lines are written in chunks rather than joined into one string, so a
 * ten-thousand-row export never holds the whole file in memory.
 */
export function writeEmployeesCsv(
  db: AppDatabase,
  filters: EmployeeFilters,
  write: (chunk: string) => void,
): void {
  write(UTF8_BOM + csvLine(HEADER));

  const rows = findEmployeesForExport(db, filters);
  let buffer = '';
  let buffered = 0;

  for (const row of rows) {
    buffer += csvLine([
      row.employeeCode,
      row.fullName,
      row.email,
      row.jobTitle,
      row.department,
      row.countryName,
      minorUnitsToDecimalString(row.salaryMinor, row.currencyMinorUnit),
      row.currencyCode,
      row.status === 'left' ? 'Left' : 'Active',
      row.hireDate,
      row.leftDate,
    ]);
    buffered += 1;

    if (buffered === CHUNK_LINES) {
      write(buffer);
      buffer = '';
      buffered = 0;
    }
  }

  if (buffer !== '') {
    write(buffer);
  }
}
