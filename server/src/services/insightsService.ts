import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../db/connection.js';
import { countries, jobTitles } from '../db/schema.js';
import {
  countrySalaryStatistics,
  jobSalaryStatisticsByCountry,
} from '../repositories/insightsRepository.js';
import { ServiceError } from './serviceError.js';

export interface CountryOverview {
  country: { code: string; name: string };
  /** Every figure below is in this currency. Stating it once beats repeating it five times. */
  currency: string;
  minorUnit: number;
  headcount: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
}

export function countryOverview(db: AppDatabase, code: string): CountryOverview {
  const country = db.select().from(countries).where(eq(countries.code, code)).get();

  if (country === undefined) {
    throw new ServiceError('NOT_FOUND', 404, `We do not employ anyone in ${code}.`);
  }

  return {
    country: { code: country.code, name: country.name },
    currency: country.currencyCode,
    minorUnit: country.currencyMinorUnit,
    ...countrySalaryStatistics(db, code),
  };
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

/**
 * What one job pays, country by country. The rows sit side by side and are
 * never combined: converting between currencies would mislead, and HR
 * compares pay within a country.
 */
export function jobOverview(db: AppDatabase, jobTitleId: number): JobOverview {
  const title = db.select().from(jobTitles).where(eq(jobTitles.id, jobTitleId)).get();

  if (title === undefined) {
    throw new ServiceError('NOT_FOUND', 404, `No job title with id ${jobTitleId}.`);
  }

  return {
    jobTitle: { id: title.id, name: title.name },
    rows: jobSalaryStatisticsByCountry(db, jobTitleId).map((row) => ({
      country: { code: row.countryCode, name: row.countryName },
      currency: row.currencyCode,
      minorUnit: row.currencyMinorUnit,
      headcount: row.headcount,
      min: row.min,
      max: row.max,
      average: row.average,
      median: row.median,
    })),
  };
}
