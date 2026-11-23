import type { AppDatabase } from './connection.js';
import { countries, departments, jobTitles } from './schema.js';

export interface Country {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: string;
  /** ISO 4217. */
  currencyCode: string;
  /** Decimal places the currency uses. Not every currency has two. */
  currencyMinorUnit: number;
}

/**
 * Countries ACME employs people in. Each has exactly one currency, which is
 * what an employee's currency is derived from.
 *
 * Japan is here deliberately: the yen has no minor units, so it keeps the
 * money handling honest rather than letting "divide by 100" pass unnoticed.
 */
export const COUNTRIES: readonly Country[] = [
  { code: 'IN', name: 'India', currencyCode: 'INR', currencyMinorUnit: 2 },
  { code: 'US', name: 'United States', currencyCode: 'USD', currencyMinorUnit: 2 },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', currencyMinorUnit: 2 },
  { code: 'DE', name: 'Germany', currencyCode: 'EUR', currencyMinorUnit: 2 },
  { code: 'JP', name: 'Japan', currencyCode: 'JPY', currencyMinorUnit: 0 },
  { code: 'SG', name: 'Singapore', currencyCode: 'SGD', currencyMinorUnit: 2 },
  { code: 'AU', name: 'Australia', currencyCode: 'AUD', currencyMinorUnit: 2 },
  { code: 'BR', name: 'Brazil', currencyCode: 'BRL', currencyMinorUnit: 2 },
];

/**
 * Fixed lists, never free text. "SDE2" and "SDE 2" typed as free text would
 * become two groups and quietly break every statistic that groups by title.
 */
export const JOB_TITLES: readonly string[] = [
  'SDE1',
  'SDE2',
  'SDE3',
  'Engineering Manager',
  'Product Manager',
  'Designer',
  'Data Analyst',
  'QA Engineer',
  'DevOps Engineer',
  'Technical Writer',
  'Recruiter',
  'Finance Analyst',
];

export const DEPARTMENTS: readonly string[] = [
  'Engineering',
  'Product',
  'Design',
  'Data',
  'People',
  'Finance',
];

/**
 * Loads the fixed lists. Safe to call on a database that already has them,
 * so it can run at every boot without needing to know whether it is the
 * first one.
 */
export function loadReferenceData(db: AppDatabase): void {
  db.insert(countries)
    .values([...COUNTRIES])
    .onConflictDoNothing()
    .run();

  db.insert(jobTitles)
    .values(JOB_TITLES.map((name) => ({ name })))
    .onConflictDoNothing()
    .run();

  db.insert(departments)
    .values(DEPARTMENTS.map((name) => ({ name })))
    .onConflictDoNothing()
    .run();
}
