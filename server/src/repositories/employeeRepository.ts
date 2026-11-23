import { type SQL, and, asc, desc, eq, sql } from 'drizzle-orm';

import type { AppDatabase } from '../db/connection.js';
import { countries, departments, employees, jobTitles, salaryChanges } from '../db/schema.js';
import { DEFAULT_PAGE_SIZE, offsetFor } from '../domain/paging.js';

export interface EmployeeFilters {
  search?: string;
  countryCode?: string;
  jobTitleId?: number;
  departmentId?: number;
  includeLeft?: boolean;
  sort?: 'name' | 'salary';
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface EmployeeRow {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyMinorUnit: number;
  salaryMinor: number;
  hireDate: string;
  status: 'active' | 'left';
  leftDate: string | null;
}

export interface EmployeePage {
  rows: EmployeeRow[];
  total: number;
}

/**
 * `%` and `_` are wildcards in LIKE, so a search for "50%" would otherwise
 * match everything. Escaping them needs an explicit ESCAPE clause.
 */
const escapeForLike = (term: string): string => term.replace(/[\\%_]/g, (char) => `\\${char}`);

function conditionsFor(filters: EmployeeFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.includeLeft !== true) {
    conditions.push(eq(employees.status, 'active'));
  }
  if (filters.countryCode !== undefined) {
    conditions.push(eq(employees.countryCode, filters.countryCode));
  }
  if (filters.jobTitleId !== undefined) {
    conditions.push(eq(employees.jobTitleId, filters.jobTitleId));
  }
  if (filters.departmentId !== undefined) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }
  if (filters.search !== undefined && filters.search !== '') {
    const term = `%${escapeForLike(filters.search)}%`;
    conditions.push(
      sql`(${employees.fullName} LIKE ${term} ESCAPE '\\' OR ${employees.employeeCode} LIKE ${term} ESCAPE '\\')`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * One page of employees, plus the total number of matches.
 *
 * Two queries rather than a `COUNT(*) OVER ()` window column: against a
 * synchronous in-process database the second query costs almost nothing, and
 * repeating the total on every row to save it is a poor trade.
 */
export function findEmployees(db: AppDatabase, filters: EmployeeFilters = {}): EmployeePage {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = filters.page ?? 1;
  const where = conditionsFor(filters);

  const direction = filters.dir === 'desc' ? desc : asc;
  const sortColumn = filters.sort === 'salary' ? employees.salaryMinor : employees.fullName;

  const rows = db
    .select({
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      email: employees.email,
      jobTitle: jobTitles.name,
      department: departments.name,
      countryCode: employees.countryCode,
      countryName: countries.name,
      currencyCode: countries.currencyCode,
      currencyMinorUnit: countries.currencyMinorUnit,
      salaryMinor: employees.salaryMinor,
      hireDate: employees.hireDate,
      status: employees.status,
      leftDate: employees.leftDate,
    })
    .from(employees)
    .innerJoin(jobTitles, eq(jobTitles.id, employees.jobTitleId))
    .innerJoin(departments, eq(departments.id, employees.departmentId))
    .innerJoin(countries, eq(countries.code, employees.countryCode))
    .where(where)
    // Employee code breaks ties, so paging cannot show the same person twice
    // or skip one when several share a name or a salary.
    .orderBy(direction(sortColumn), asc(employees.employeeCode))
    .limit(pageSize)
    .offset(offsetFor(page, pageSize))
    .all();

  const counted = db
    .select({ total: sql<number>`count(*)` })
    .from(employees)
    .where(where)
    .get();

  return { rows, total: counted?.total ?? 0 };
}

export type EmployeeRecord = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type NewSalaryChange = typeof salaryChanges.$inferInsert;

/** The stored row, unjoined. Writes need the id and the current salary. */
export function findEmployeeByCode(db: AppDatabase, code: string): EmployeeRecord | undefined {
  return db.select().from(employees).where(eq(employees.employeeCode, code)).get();
}

export function insertEmployee(db: AppDatabase, values: NewEmployee): void {
  db.insert(employees).values(values).run();
}

/**
 * Applies the field changes and, when the salary moved, records the change in
 * the same transaction. The two must not be able to drift apart: the employee
 * row is what every statistic reads, and the history is what HR is shown.
 */
export function updateEmployeeWithSalaryChange(
  db: AppDatabase,
  id: number,
  fields: Partial<NewEmployee>,
  change: NewSalaryChange | null,
): void {
  db.transaction((tx) => {
    tx.update(employees).set(fields).where(eq(employees.id, id)).run();
    if (change !== null) {
      tx.insert(salaryChanges).values(change).run();
    }
  });
}
