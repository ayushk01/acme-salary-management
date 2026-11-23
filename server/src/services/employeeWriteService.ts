import type { AppDatabase } from '../db/connection.js';
import type { Clock } from '../domain/clock.js';
import {
  findEmployeeByCode,
  insertEmployee,
  updateEmployeeWithSalaryChange,
} from '../repositories/employeeRepository.js';
import { type EmployeeSummary, listEmployees } from './employeeService.js';
import { duplicateEmployeeCode, employeeHasLeft, employeeNotFound } from './serviceError.js';

export interface NewEmployeeInput {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitleId: number;
  departmentId: number;
  countryCode: string;
  salaryMinor: number;
  hireDate: string;
}

export interface EmployeeEdit {
  fullName?: string;
  email?: string;
  jobTitleId?: number;
  departmentId?: number;
  countryCode?: string;
  salaryMinor?: number;
  salaryReason?: 'raise' | 'promotion' | 'correction';
  salaryEffectiveDate?: string;
}

/** Reads one employee back through the same mapping the list uses. */
function summaryFor(db: AppDatabase, code: string): EmployeeSummary {
  const found = listEmployees(db, { search: code, includeLeft: true }).rows.find(
    (row) => row.employeeCode === code,
  );
  if (found === undefined) {
    throw employeeNotFound(code);
  }
  return found;
}

export function createEmployee(
  db: AppDatabase,
  clock: Clock,
  input: NewEmployeeInput,
  changedBy: string,
): EmployeeSummary {
  if (findEmployeeByCode(db, input.employeeCode) !== undefined) {
    throw duplicateEmployeeCode(input.employeeCode);
  }

  const at = clock.nowIso();

  insertEmployee(db, {
    ...input,
    status: 'active',
    leftDate: null,
    createdAt: at,
    createdBy: changedBy,
    updatedAt: at,
    updatedBy: changedBy,
  });

  return summaryFor(db, input.employeeCode);
}

export function editEmployee(
  db: AppDatabase,
  clock: Clock,
  code: string,
  edit: EmployeeEdit,
  changedBy: string,
): EmployeeSummary {
  const existing = findEmployeeByCode(db, code);
  if (existing === undefined) {
    throw employeeNotFound(code);
  }
  // Someone who has left keeps their history, but nothing about them changes.
  if (existing.status === 'left') {
    throw employeeHasLeft(code);
  }

  const { salaryReason, salaryEffectiveDate, ...fields } = edit;
  const salaryMoved = edit.salaryMinor !== undefined && edit.salaryMinor !== existing.salaryMinor;

  updateEmployeeWithSalaryChange(
    db,
    existing.id,
    { ...fields, updatedAt: clock.nowIso(), updatedBy: changedBy },
    salaryMoved && edit.salaryMinor !== undefined
      ? {
          employeeId: existing.id,
          oldSalaryMinor: existing.salaryMinor,
          newSalaryMinor: edit.salaryMinor,
          effectiveDate: salaryEffectiveDate ?? clock.todayIso(),
          reason: salaryReason ?? 'correction',
          changedBy,
          changedAt: clock.nowIso(),
        }
      : null,
  );

  return summaryFor(db, code);
}

/**
 * Nothing is ever deleted: the employee is marked as left, which removes them
 * from the active list and from every statistic while their record and salary
 * history stay readable.
 */
export function markEmployeeAsLeft(
  db: AppDatabase,
  clock: Clock,
  code: string,
  leftDate: string,
  changedBy: string,
): EmployeeSummary {
  const existing = findEmployeeByCode(db, code);
  if (existing === undefined) {
    throw employeeNotFound(code);
  }
  if (existing.status === 'left') {
    throw employeeHasLeft(code);
  }

  updateEmployeeWithSalaryChange(
    db,
    existing.id,
    { status: 'left', leftDate, updatedAt: clock.nowIso(), updatedBy: changedBy },
    null,
  );

  return summaryFor(db, code);
}
