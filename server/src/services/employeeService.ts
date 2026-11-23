import type { AppDatabase } from '../db/connection.js';
import { eq } from 'drizzle-orm';

import { countries, departments, jobTitles } from '../db/schema.js';
import { DEFAULT_PAGE_SIZE } from '../domain/paging.js';
import {
  type EmployeeFilters,
  findEmployeeByCode,
  findEmployees,
  findSalaryHistory,
} from '../repositories/employeeRepository.js';
import { employeeNotFound } from './serviceError.js';

export interface Money {
  amountMinor: number;
  currency: string;
  minorUnit: number;
}

export interface EmployeeSummary {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: { code: string; name: string };
  salary: Money;
  hireDate: string;
  status: 'active' | 'left';
  leftDate: string | null;
  /** Who last touched this record, and when. The Must-level audit answer. */
  updatedAt: string;
  updatedBy: string;
}

export interface EmployeeListResult {
  rows: EmployeeSummary[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Money leaves the server as an integer plus its currency, never as a
 * formatted string: formatting is the browser's job, and a string here would
 * be a number nobody could compute with.
 */
export function listEmployees(db: AppDatabase, filters: EmployeeFilters): EmployeeListResult {
  const { rows, total } = findEmployees(db, filters);

  return {
    rows: rows.map((row) => ({
      employeeCode: row.employeeCode,
      fullName: row.fullName,
      email: row.email,
      jobTitle: row.jobTitle,
      department: row.department,
      country: { code: row.countryCode, name: row.countryName },
      salary: {
        amountMinor: row.salaryMinor,
        currency: row.currencyCode,
        minorUnit: row.currencyMinorUnit,
      },
      hireDate: row.hireDate,
      status: row.status,
      leftDate: row.leftDate,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    })),
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
    total,
  };
}

export interface ReferenceLists {
  countries: {
    code: string;
    name: string;
    currencyCode: string;
    currencyMinorUnit: number;
  }[];
  jobTitles: { id: number; name: string }[];
  departments: { id: number; name: string }[];
}

/**
 * The fixed lists the dropdowns are built from. Each country carries its
 * currency, so the UI formats money without guessing or hard-coding.
 */
export function listReference(db: AppDatabase): ReferenceLists {
  return {
    countries: db
      .select({
        code: countries.code,
        name: countries.name,
        currencyCode: countries.currencyCode,
        currencyMinorUnit: countries.currencyMinorUnit,
      })
      .from(countries)
      .orderBy(countries.name)
      .all(),
    jobTitles: db
      .select({ id: jobTitles.id, name: jobTitles.name })
      .from(jobTitles)
      .orderBy(jobTitles.name)
      .all(),
    departments: db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .orderBy(departments.name)
      .all(),
  };
}

export interface SalaryHistoryRow {
  oldSalary: Money;
  newSalary: Money;
  effectiveDate: string;
  reason: 'raise' | 'promotion' | 'correction';
  changedBy: string;
  changedAt: string;
}

/**
 * One employee's pay over time.
 *
 * Both amounts carry the employee's own currency, because a history row is
 * meaningless without it and the browser must never have to guess.
 */
export function listSalaryHistory(db: AppDatabase, code: string): { rows: SalaryHistoryRow[] } {
  const employee = findEmployeeByCode(db, code);
  if (employee === undefined) {
    throw employeeNotFound(code);
  }

  const country = db
    .select({ currencyCode: countries.currencyCode, minorUnit: countries.currencyMinorUnit })
    .from(countries)
    .where(eq(countries.code, employee.countryCode))
    .get();

  const currency = country?.currencyCode ?? '';
  const minorUnit = country?.minorUnit ?? 2;

  return {
    rows: findSalaryHistory(db, employee.id).map((change) => ({
      oldSalary: { amountMinor: change.oldSalaryMinor, currency, minorUnit },
      newSalary: { amountMinor: change.newSalaryMinor, currency, minorUnit },
      effectiveDate: change.effectiveDate,
      reason: change.reason,
      changedBy: change.changedBy,
      changedAt: change.changedAt,
    })),
  };
}
