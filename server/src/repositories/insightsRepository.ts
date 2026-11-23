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

export interface OutlierRow {
  employeeCode: string;
  fullName: string;
  jobTitle: string;
  salary: number;
  median: number;
  groupSize: number;
  percentFromMedian: number;
}

/**
 * Who is paid outside the range for their job title in one country.
 *
 * The same median window as above, partitioned by job title. The comparison
 * multiplies rather than divides, so it stays in integers and never touches a
 * float: `salary * 100 > median * (100 + threshold)`. Strict `>` and `<` mean
 * a salary exactly at the threshold is inside the range.
 *
 * The threshold and the minimum group size arrive as bound parameters from
 * payRules.ts, so this query and the pure isOutsideRange cannot disagree
 * about the rule.
 */
export function outliersForCountry(
  db: AppDatabase,
  countryCode: string,
  thresholdPercent: number,
  minimumGroupSize: number,
): OutlierRow[] {
  return db.all<OutlierRow>(sql`
    WITH ranked AS (
      SELECT e.id, e.employee_code, e.full_name, e.job_title_id, e.salary_minor,
             ROW_NUMBER() OVER (PARTITION BY e.job_title_id ORDER BY e.salary_minor) AS rn,
             COUNT(*)     OVER (PARTITION BY e.job_title_id)                         AS n
      FROM employees e
      WHERE e.country_code = ${countryCode} AND e.status = 'active'
    ),
    medians AS (
      SELECT job_title_id, n,
             CAST(ROUND(AVG(salary_minor)) AS INTEGER) AS median_minor
      FROM ranked
      WHERE rn IN ((n + 1) / 2, (n + 2) / 2)
      GROUP BY job_title_id, n
    )
    SELECT
      r.employee_code                                                   AS employeeCode,
      r.full_name                                                       AS fullName,
      t.name                                                            AS jobTitle,
      r.salary_minor                                                    AS salary,
      m.median_minor                                                    AS median,
      m.n                                                               AS groupSize,
      ROUND((r.salary_minor - m.median_minor) * 100.0 / m.median_minor, 1) AS percentFromMedian
    FROM ranked r
    JOIN medians    m ON m.job_title_id = r.job_title_id
    JOIN job_titles t ON t.id           = r.job_title_id
    WHERE m.n >= ${minimumGroupSize}
      AND (r.salary_minor * 100 > m.median_minor * (100 + ${thresholdPercent})
        OR r.salary_minor * 100 < m.median_minor * (100 - ${thresholdPercent}))
    ORDER BY r.salary_minor DESC
  `);
}
