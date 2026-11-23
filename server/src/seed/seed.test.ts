import { describe, expect, it } from 'vitest';

import { createTestDatabase } from '../db/testDb.js';
import { employees, jobTitles, salaryChanges } from '../db/schema.js';
import { MIN_GROUP_SIZE, isOutsideRange } from '../domain/payRules.js';
import { DEFAULT_EMPLOYEE_COUNT, DEMO_OUTLIER_GROUP, seedDatabase } from './seed.js';

/**
 * Tests seed a few hundred employees rather than ten thousand. It is the
 * same code path, and it keeps the suite fast enough to run on every save.
 */
const TEST_COUNT = 300;

/** Median computed independently of the production SQL, so it is a check. */
const medianOf = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  if (sorted.length % 2 === 1) {
    return sorted[Math.floor(middle)] ?? 0;
  }
  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
};

describe('seedDatabase', () => {
  it('creates the number of employees it was asked for', () => {
    const { db, close } = createTestDatabase();

    seedDatabase(db, { employeeCount: TEST_COUNT });

    expect(db.select().from(employees).all()).toHaveLength(TEST_COUNT);
    close();
  });

  it('defaults to the ten thousand the brief asks for', () => {
    expect(DEFAULT_EMPLOYEE_COUNT).toBe(10_000);
  });

  it('produces identical data on two separate runs', () => {
    const run = () => {
      const { db, close } = createTestDatabase();
      seedDatabase(db, { employeeCount: TEST_COUNT });
      const rows = db.select().from(employees).all();
      const changes = db.select().from(salaryChanges).all();
      close();
      return { rows, changes };
    };

    expect(run()).toEqual(run());
  });

  it('does nothing when the database already has employees', () => {
    const { db, close } = createTestDatabase();
    seedDatabase(db, { employeeCount: TEST_COUNT });

    const second = seedDatabase(db, { employeeCount: TEST_COUNT });

    expect(second.employeesCreated).toBe(0);
    expect(db.select().from(employees).all()).toHaveLength(TEST_COUNT);
    close();
  });

  it('includes employees who have left, with a leaving date', () => {
    const { db, close } = createTestDatabase();
    seedDatabase(db, { employeeCount: TEST_COUNT });

    const left = db
      .select()
      .from(employees)
      .all()
      .filter((row) => row.status === 'left');

    expect(left.length).toBeGreaterThan(0);
    expect(left.every((row) => row.leftDate !== null)).toBe(true);
    close();
  });

  it('gives some employees a salary history', () => {
    const { db, close } = createTestDatabase();
    seedDatabase(db, { employeeCount: TEST_COUNT });

    expect(db.select().from(salaryChanges).all().length).toBeGreaterThan(0);
    close();
  });

  it('plants an outlier inside a group big enough to judge', () => {
    const { db, close } = createTestDatabase();
    seedDatabase(db, { employeeCount: TEST_COUNT });

    const titleId = db
      .select()
      .from(jobTitles)
      .all()
      .find((title) => title.name === DEMO_OUTLIER_GROUP.jobTitle)?.id;

    const group = db
      .select()
      .from(employees)
      .all()
      .filter(
        (row) =>
          row.countryCode === DEMO_OUTLIER_GROUP.countryCode &&
          row.jobTitleId === titleId &&
          row.status === 'active',
      );

    expect(group.length).toBeGreaterThanOrEqual(MIN_GROUP_SIZE);

    const median = medianOf(group.map((row) => row.salaryMinor));
    expect(group.some((row) => isOutsideRange(row.salaryMinor, median))).toBe(true);

    close();
  });
});
