import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AppDatabase } from '../db/connection.js';
import { jobTitles } from '../db/schema.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';
import { findEmployees } from './employeeRepository.js';

let db: AppDatabase;
let close: () => void;
let sde2: number;
let sde3: number;

const titleId = (name: string): number => {
  const found = db
    .select()
    .from(jobTitles)
    .all()
    .find((row) => row.name === name);
  if (!found) {
    throw new Error(`No job title ${name} in the reference data`);
  }
  return found.id;
};

beforeEach(() => {
  const handle = createTestDatabase();
  db = handle.db;
  close = handle.close;

  sde2 = titleId('SDE2');
  sde3 = titleId('SDE3');

  insertTestEmployee(db, {
    employeeCode: 'EMP00001',
    fullName: 'Asha Rao',
    countryCode: 'IN',
    jobTitleId: sde2,
    salaryMinor: 1_000_000,
  });
  insertTestEmployee(db, {
    employeeCode: 'EMP00002',
    fullName: 'Ravi Menon',
    countryCode: 'IN',
    jobTitleId: sde3,
    salaryMinor: 3_000_000,
  });
  insertTestEmployee(db, {
    employeeCode: 'EMP00003',
    fullName: 'Emma Smith',
    countryCode: 'US',
    jobTitleId: sde2,
    salaryMinor: 2_000_000,
  });
  insertTestEmployee(db, {
    employeeCode: 'EMP00004',
    fullName: 'Kenji Tanaka',
    countryCode: 'JP',
    jobTitleId: sde2,
    salaryMinor: 5_000_000,
    status: 'left',
    leftDate: '2026-03-01',
  });
});

const codes = (filters: Parameters<typeof findEmployees>[1] = {}): string[] =>
  findEmployees(db, filters).rows.map((row) => row.employeeCode);

describe('findEmployees', () => {
  it('hides people who have left', () => {
    expect(codes()).not.toContain('EMP00004');
  });

  it('includes them when asked', () => {
    expect(codes({ includeLeft: true })).toContain('EMP00004');
  });

  it('filters by country', () => {
    expect(codes({ countryCode: 'IN' })).toEqual(['EMP00001', 'EMP00002']);
  });

  it('combines filters rather than choosing between them', () => {
    expect(codes({ countryCode: 'IN', jobTitleId: sde2 })).toEqual(['EMP00001']);
  });

  it('finds part of a name, ignoring case', () => {
    expect(codes({ search: 'rao' })).toEqual(['EMP00001']);
  });

  it('finds an employee by their code', () => {
    expect(codes({ search: 'EMP00003' })).toEqual(['EMP00003']);
  });

  it('sorts by salary, highest first, when asked', () => {
    expect(codes({ sort: 'salary', dir: 'desc' })).toEqual([
      'EMP00002',
      'EMP00003',
      'EMP00001',
    ]);
  });

  it('counts every match, not just the page returned', () => {
    const result = findEmployees(db, { pageSize: 1 });

    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it('returns the page that was asked for', () => {
    expect(codes({ pageSize: 1, page: 2 })).toEqual(['EMP00002']);
  });

  it('carries the currency of the employee country, not a default', () => {
    const japanese = findEmployees(db, { includeLeft: true, countryCode: 'JP' }).rows[0];

    expect(japanese?.currencyCode).toBe('JPY');
    expect(japanese?.currencyMinorUnit).toBe(0);
  });
});

afterEach(() => {
  close();
});
