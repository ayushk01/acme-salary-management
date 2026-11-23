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
