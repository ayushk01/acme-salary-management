import { type AppDatabase, type DatabaseHandle, createDatabase } from './connection.js';
import { runMigrations } from './migrate.js';
import { loadReferenceData } from './referenceData.js';
import { employees } from './schema.js';

/**
 * A real SQLite database in memory, with the same migrations and pragmas the
 * deployed one gets.
 *
 * Tests run against this rather than a mocked repository, because the logic
 * worth testing in this product lives in SQL. A mock would only confirm that
 * it returns what it was told to.
 */
export function createTestDatabase(): DatabaseHandle {
  const handle = createDatabase(':memory:');

  runMigrations(handle.db);
  loadReferenceData(handle.db);

  return handle;
}

export interface TestEmployeeOverrides {
  employeeCode: string;
  fullName?: string;
  email?: string;
  jobTitleId?: number;
  departmentId?: number;
  countryCode?: string;
  salaryMinor?: number;
  hireDate?: string;
  status?: 'active' | 'left';
  leftDate?: string | null;
}

/**
 * Inserts one employee with everything defaulted except what a test cares
 * about, so each test shows only the field under examination.
 *
 * Timestamps are fixed rather than taken from the clock: tests must not
 * depend on when they run.
 */
export function insertTestEmployee(db: AppDatabase, overrides: TestEmployeeOverrides): void {
  const at = '2026-01-01T00:00:00.000Z';

  db.insert(employees)
    .values({
      employeeCode: overrides.employeeCode,
      fullName: overrides.fullName ?? 'Test Employee',
      email: overrides.email ?? `${overrides.employeeCode.toLowerCase()}@acme.example`,
      jobTitleId: overrides.jobTitleId ?? 1,
      departmentId: overrides.departmentId ?? 1,
      countryCode: overrides.countryCode ?? 'IN',
      salaryMinor: overrides.salaryMinor ?? 1_000_000,
      hireDate: overrides.hireDate ?? '2020-01-01',
      status: overrides.status ?? 'active',
      leftDate: overrides.leftDate ?? null,
      createdAt: at,
      createdBy: 'Test Setup',
      updatedAt: at,
      updatedBy: 'Test Setup',
    })
    .run();
}
