import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiGet } from '../api/client.js';
import type { EmployeeListResult, ReferenceLists } from '../api/types.js';
import {
  type ListFilters,
  filtersFromSearch,
  searchFromFilters,
  withChange,
} from '../employees/filters.js';
import { formatMoney, localeForCountry } from '../money.js';

export function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = filtersFromSearch(searchParams.toString());

  const [reference, setReference] = useState<ReferenceLists | null>(null);
  const [result, setResult] = useState<EmployeeListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // The search box is local so typing does not rewrite the URL on every
  // keystroke; it is pushed into the URL on submit.
  const [searchText, setSearchText] = useState(filters.search);

  const update = (change: Partial<ListFilters>) => {
    setSearchParams(searchFromFilters(withChange(filters, change)));
  };

  useEffect(() => {
    apiGet<ReferenceLists>('/api/reference')
      .then(setReference)
      .catch(() => setReference(null));
  }, []);

  const query = searchFromFilters(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiGet<EmployeeListResult>(`/api/employees${query === '' ? '' : `?${query}`}`)
      .then((page) => {
        if (!cancelled) {
          setResult(page);
          setError(null);
        }
      })
      .catch((caught: Error) => {
        if (!cancelled) {
          setError(caught.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const sortBy = (column: 'name' | 'salary') => {
    const sameColumn = filters.sort === column;
    update({ sort: column, dir: sameColumn && filters.dir === 'asc' ? 'desc' : 'asc' });
  };

  const sortMark = (column: 'name' | 'salary') =>
    filters.sort === column ? (filters.dir === 'asc' ? ' ↑' : ' ↓') : '';

  const firstOnPage =
    result === null || result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const lastOnPage = result === null ? 0 : Math.min(result.page * result.pageSize, result.total);
  const lastPage = result === null ? 1 : Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <main>
      <h1>Employees</h1>

      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
          update({ search: searchText.trim() });
        }}
      >
        <label>
          Search
          <input
            type="search"
            value={searchText}
            placeholder="Name or employee code"
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>

        <label>
          Country
          <select
            value={filters.country}
            onChange={(event) => update({ country: event.target.value })}
          >
            <option value="">All countries</option>
            {reference?.countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Job title
          <select
            value={filters.jobTitleId ?? ''}
            onChange={(event) =>
              update({ jobTitleId: event.target.value === '' ? null : Number(event.target.value) })
            }
          >
            <option value="">All job titles</option>
            {reference?.jobTitles.map((title) => (
              <option key={title.id} value={title.id}>
                {title.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Department
          <select
            value={filters.departmentId ?? ''}
            onChange={(event) =>
              update({
                departmentId: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          >
            <option value="">All departments</option>
            {reference?.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.includeLeft}
            onChange={(event) => update({ includeLeft: event.target.checked })}
          />
          Include people who have left
        </label>

        <button type="submit">Search</button>
      </form>

      {error !== null && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>
              <button type="button" onClick={() => sortBy('name')}>
                Name{sortMark('name')}
              </button>
            </th>
            <th>Job title</th>
            <th>Department</th>
            <th>Country</th>
            <th className="right">
              <button type="button" onClick={() => sortBy('salary')}>
                Salary{sortMark('salary')}
              </button>
            </th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {result?.rows.map((employee) => (
            <tr key={employee.employeeCode}>
              <td>{employee.employeeCode}</td>
              <td>{employee.fullName}</td>
              <td>{employee.jobTitle}</td>
              <td>{employee.department}</td>
              <td>{employee.country.name}</td>
              <td className="right">
                {formatMoney(employee.salary, localeForCountry(employee.country.code))}
              </td>
              <td>{employee.status === 'left' ? 'Left' : 'Active'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && result?.total === 0 && <p>No employees match these filters.</p>}

      <nav className="pager">
        <button
          type="button"
          disabled={filters.page <= 1}
          onClick={() => update({ page: filters.page - 1 })}
        >
          Previous
        </button>
        <span>
          {result === null ? 'Loading…' : `${firstOnPage}–${lastOnPage} of ${result.total}`}
        </span>
        <button
          type="button"
          disabled={result === null || filters.page >= lastPage}
          onClick={() => update({ page: filters.page + 1 })}
        >
          Next
        </button>
      </nav>
    </main>
  );
}
