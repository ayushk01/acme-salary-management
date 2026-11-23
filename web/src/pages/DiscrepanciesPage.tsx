import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { apiGet } from '../api/client.js';
import type { DiscrepanciesResult, ReferenceLists } from '../api/types.js';
import { formatMoney, localeForCountry } from '../money.js';

export function DiscrepanciesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get('country') ?? '';

  const [reference, setReference] = useState<ReferenceLists | null>(null);
  const [result, setResult] = useState<DiscrepanciesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ReferenceLists>('/api/reference')
      .then((lists) => {
        setReference(lists);
        if (selected === '' && lists.countries[0] !== undefined) {
          setSearchParams({ country: lists.countries[0].code }, { replace: true });
        }
      })
      .catch(() => setError('Could not load the country list.'));
  }, []);

  useEffect(() => {
    if (selected === '') {
      return;
    }
    apiGet<DiscrepanciesResult>(
      `/api/insights/discrepancies?country=${encodeURIComponent(selected)}`,
    )
      .then((found) => {
        setResult(found);
        setError(null);
      })
      .catch(() => setError('Could not load that country.'));
  }, [selected]);

  const money = (amountMinor: number): string =>
    result === null
      ? ''
      : formatMoney(
          { amountMinor, currency: result.currency, minorUnit: result.minorUnit },
          localeForCountry(result.country.code),
        );

  return (
    <main>
      <h1>Paid outside their range</h1>

      <form className="filters">
        <label>
          Country
          <select
            value={selected}
            onChange={(event) => setSearchParams({ country: event.target.value })}
          >
            {reference?.countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
      </form>

      {error !== null && <p className="error">{error}</p>}

      {result !== null && (
        <p className="hint">
          More than {result.thresholdPercent}% above or below the median for the same job title in{' '}
          {result.country.name}. Job titles with fewer than {result.minimumGroupSize} active people
          are not judged, and people who have left are not counted.
        </p>
      )}

      {result !== null && result.rows.length === 0 && (
        <p>Nobody in {result.country.name} is paid outside their range.</p>
      )}

      {result !== null && result.rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Job title</th>
              <th className="right">Salary</th>
              <th className="right">Group median</th>
              <th className="right">Difference</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.employeeCode}>
                <td>
                  <Link to={`/employees/${row.employeeCode}/edit`}>{row.employeeCode}</Link>
                </td>
                <td>{row.fullName}</td>
                <td>{row.jobTitle}</td>
                <td className="right">{money(row.salary)}</td>
                <td className="right">{money(row.median)}</td>
                <td className={`right ${row.percentFromMedian < 0 ? 'below' : 'above'}`}>
                  {row.percentFromMedian > 0 ? '+' : ''}
                  {row.percentFromMedian}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
