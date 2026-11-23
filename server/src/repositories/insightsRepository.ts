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

export interface CountryStatisticsRow extends SalaryStatistics {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyMinorUnit: number;
}

/**
 * One job title's pay, a row per country.
 *
 * The same median window as above, with PARTITION BY country_code so the row
 * numbering and the count restart for each country. Without the partition
 * every row would report the figures for the whole world, which is both wrong
 * and exactly the kind of wrong that looks plausible.
 *
 * Countries are never added together: salaries in different currencies have
 * no meaningful sum.
 */
export function jobSalaryStatisticsByCountry(
  db: AppDatabase,
  jobTitleId: number,
): CountryStatisticsRow[] {
  return db.all<CountryStatisticsRow>(sql`
    WITH active AS (
      SELECT country_code, salary_minor
      FROM employees
      WHERE job_title_id = ${jobTitleId} AND status = 'active'
    ),
    ranked AS (
      SELECT country_code, salary_minor,
             ROW_NUMBER() OVER (PARTITION BY country_code ORDER BY salary_minor) AS rn,
             COUNT(*)     OVER (PARTITION BY country_code)                       AS n
      FROM active
    ),
    medians AS (
      SELECT country_code, CAST(ROUND(AVG(salary_minor)) AS INTEGER) AS median
      FROM ranked
      WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
      GROUP BY country_code
    )
    SELECT
      a.country_code                                  AS countryCode,
      c.name                                          AS countryName,
      c.currency_code                                 AS currencyCode,
      c.currency_minor_unit                           AS currencyMinorUnit,
      COUNT(*)                                        AS headcount,
      MIN(a.salary_minor)                             AS min,
      MAX(a.salary_minor)                             AS max,
      CAST(ROUND(AVG(a.salary_minor)) AS INTEGER)     AS average,
      m.median                                        AS median
    FROM active a
    JOIN countries c ON c.code = a.country_code
    JOIN medians  m ON m.country_code = a.country_code
    GROUP BY a.country_code, c.name, c.currency_code, c.currency_minor_unit, m.median
    ORDER BY c.name
  `);
}
