import { sql } from 'drizzle-orm';

import type { AppDatabase } from '../db/connection.js';

export interface SalaryStatistics {
  headcount: number;
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
}

/**
 * Every figure for one country, computed by SQLite in a single query.
 *
 * SQLite has no `median()`, so it is built from a window function:
 * `ROW_NUMBER()` against `COUNT(*) OVER ()`, taking rows `(n+1)/2` and
 * `(n+2)/2`. Integer division makes those collapse to one row when the count
 * is odd and straddle the middle when it is even, so `AVG` handles both
 * without a branch.
 *
 * Average and median are both rounded to a whole minor unit, because half a
 * paisa is not a thing a currency can express. SQLite rounds half away from
 * zero.
 *
 * An empty country yields a headcount of zero and nulls for the rest, rather
 * than an error: "nobody here" is an answer, not a failure.
 */
export function countrySalaryStatistics(db: AppDatabase, countryCode: string): SalaryStatistics {
  const row = db.get<SalaryStatistics>(sql`
      WITH active AS (
        SELECT salary_minor
        FROM employees
        WHERE country_code = ${countryCode} AND status = 'active'
      ),
      ranked AS (
        SELECT salary_minor,
               ROW_NUMBER() OVER (ORDER BY salary_minor) AS rn,
               COUNT(*)     OVER ()                      AS n
        FROM active
      )
      SELECT
        (SELECT COUNT(*) FROM active)                               AS headcount,
        (SELECT MIN(salary_minor) FROM active)                      AS min,
        (SELECT MAX(salary_minor) FROM active)                      AS max,
        (SELECT CAST(ROUND(AVG(salary_minor)) AS INTEGER) FROM active) AS average,
        (SELECT CAST(ROUND(AVG(salary_minor)) AS INTEGER)
         FROM ranked WHERE rn IN ((n + 1) / 2, (n + 2) / 2))        AS median
    `);

  return {
    headcount: row?.headcount ?? 0,
    min: row?.min ?? null,
    max: row?.max ?? null,
    average: row?.average ?? null,
    median: row?.median ?? null,
  };
}
