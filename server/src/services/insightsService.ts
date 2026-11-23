import { eq } from 'drizzle-orm';

import type { AppDatabase } from '../db/connection.js';
import { countries } from '../db/schema.js';
import { countrySalaryStatistics } from '../repositories/insightsRepository.js';
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
