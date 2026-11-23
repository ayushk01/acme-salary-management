import type { Money } from '../money.js';

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
  updatedAt: string;
  updatedBy: string;
}

export interface EmployeeListResult {
  rows: EmployeeSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ReferenceLists {
  countries: { code: string; name: string; currencyCode: string; currencyMinorUnit: number }[];
  jobTitles: { id: number; name: string }[];
  departments: { id: number; name: string }[];
}

export interface SalaryHistoryRow {
  oldSalary: Money;
  newSalary: Money;
  effectiveDate: string;
  reason: 'raise' | 'promotion' | 'correction';
  changedBy: string;
  changedAt: string;
}

export interface SalaryHistoryResult {
  rows: SalaryHistoryRow[];
}

export interface CountryOverview {
  country: { code: string; name: string };
  currency: string;
  minorUnit: number;
  headcount: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
}

export interface JobCountryRow {
  country: { code: string; name: string };
  currency: string;
  minorUnit: number;
  headcount: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
}

export interface JobOverview {
  jobTitle: { id: number; name: string };
  rows: JobCountryRow[];
}
