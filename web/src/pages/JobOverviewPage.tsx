import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiGet } from '../api/client.js';
import type { JobCountryRow, JobOverview, ReferenceLists } from '../api/types.js';
import { formatMoney, localeForCountry } from '../money.js';

const money = (amountMinor: number | null, row: JobCountryRow): string =>
  amountMinor === null
    ? '—'
    : formatMoney(
        { amountMinor, currency: row.currency, minorUnit: row.minorUnit },
        localeForCountry(row.country.code),
      );

export function JobOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get('jobTitleId') ?? '';

  const [reference, setReference] = useState<ReferenceLists | null>(null);
  const [overview, setOverview] = useState<JobOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ReferenceLists>('/api/reference')
      .then((lists) => {
        setReference(lists);
        if (selected === '' && lists.jobTitles[0] !== undefined) {
          setSearchParams({ jobTitleId: String(lists.jobTitles[0].id) }, { replace: true });
        }
      })
      .catch(() => setError('Could not load the job titles.'));
  }, []);

  useEffect(() => {
    if (selected === '') {
      return;
    }
    apiGet<JobOverview>(`/api/insights/job/${encodeURIComponent(selected)}`)
      .then((result) => {
        setOverview(result);
        setError(null);
      })
      .catch(() => setError('Could not load that job title.'));
  }, [selected]);

  return (
    <main>
      <h1>Pay by job title</h1>

      <form className="filters">
        <label>
          Job title
          <select
            value={selected}
            onChange={(event) => setSearchParams({ jobTitleId: event.target.value })}
          >
            {reference?.jobTitles.map((title) => (
              <option key={title.id} value={title.id}>
                {title.name}
              </option>
            ))}
          </select>
        </label>
      </form>

      {error !== null && <p className="error">{error}</p>}

      <p className="hint">
        Each country is shown in its own currency and never combined with another. People who have
        left are not counted.
      </p>

      {overview !== null && overview.rows.length === 0 && (
        <p>Nobody is currently employed as {overview.jobTitle.name} anywhere.</p>
      )}

      {overview !== null && overview.rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Country</th>
              <th className="right">People</th>
              <th className="right">Lowest</th>
              <th className="right">Median</th>
              <th className="right">Average</th>
              <th className="right">Highest</th>
            </tr>
          </thead>
          <tbody>
            {overview.rows.map((row) => (
              <tr key={row.country.code}>
                <td>{row.country.name}</td>
                <td className="right">{row.headcount}</td>
                <td className="right">{money(row.min, row)}</td>
                <td className="right">{money(row.median, row)}</td>
                <td className="right">{money(row.average, row)}</td>
                <td className="right">{money(row.max, row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
