import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiGet } from '../api/client.js';
import type { CountryOverview, ReferenceLists } from '../api/types.js';
import { formatMoney, localeForCountry } from '../money.js';

/** A figure that may legitimately have no value, because nobody works there. */
function Figure({
  label,
  amountMinor,
  overview,
}: {
  label: string;
  amountMinor: number | null;
  overview: CountryOverview;
}) {
  return (
    <div className="figure">
      <span className="figure-label">{label}</span>
      <span className="figure-value">
        {amountMinor === null
          ? '—'
          : formatMoney(
              { amountMinor, currency: overview.currency, minorUnit: overview.minorUnit },
              localeForCountry(overview.country.code),
            )}
      </span>
    </div>
  );
}

export function CountryOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get('country') ?? '';

  const [reference, setReference] = useState<ReferenceLists | null>(null);
  const [overview, setOverview] = useState<CountryOverview | null>(null);
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
    // Only on mount. The selected country is read from the URL by the effect
    // below, so this one exists purely to fill the dropdown and to default
    // the URL when it arrives empty.
  }, []);

  useEffect(() => {
    if (selected === '') {
      return;
    }
    apiGet<CountryOverview>(`/api/insights/country/${encodeURIComponent(selected)}`)
      .then((result) => {
        setOverview(result);
        setError(null);
      })
      .catch(() => setError('Could not load that country.'));
  }, [selected]);

  return (
    <main>
      <h1>Pay by country</h1>

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

      {overview !== null && (
        <>
          <p className="hint">
            {overview.headcount === 0
              ? `Nobody is currently employed in ${overview.country.name}.`
              : `${overview.headcount} ${overview.headcount === 1 ? 'person' : 'people'} in ${
                  overview.country.name
                }, paid in ${overview.currency}. People who have left are not counted.`}
          </p>

          <div className="figures">
            <Figure label="Lowest" amountMinor={overview.min} overview={overview} />
            <Figure label="Median" amountMinor={overview.median} overview={overview} />
            <Figure label="Average" amountMinor={overview.average} overview={overview} />
            <Figure label="Highest" amountMinor={overview.max} overview={overview} />
          </div>
        </>
      )}
    </main>
  );
}
