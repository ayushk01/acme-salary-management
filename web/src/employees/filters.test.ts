import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FILTERS,
  type ListFilters,
  filtersFromSearch,
  searchFromFilters,
  withChange,
} from './filters.js';

const filled: ListFilters = {
  search: 'rao',
  country: 'IN',
  jobTitleId: 2,
  departmentId: 3,
  includeLeft: true,
  sort: 'salary',
  dir: 'desc',
  page: 4,
};

describe('filtersFromSearch', () => {
  it('shows page one by name ascending, hiding people who have left, when the URL is empty', () => {
    expect(filtersFromSearch('')).toEqual({
      search: '',
      country: '',
      jobTitleId: null,
      departmentId: null,
      includeLeft: false,
      sort: 'name',
      dir: 'asc',
      page: 1,
    });
  });

  it('reads country, job title and page out of the URL', () => {
    const filters = filtersFromSearch('?country=IN&jobTitleId=2&page=3');

    expect(filters.country).toBe('IN');
    expect(filters.jobTitleId).toBe(2);
    expect(filters.page).toBe(3);
  });

  it('reads department out of the URL', () => {
    expect(filtersFromSearch('?departmentId=3').departmentId).toBe(3);
  });

  it('shows people who have left only when includeLeft is exactly "true"', () => {
    expect(filtersFromSearch('?includeLeft=true').includeLeft).toBe(true);
  });

  it('treats any other includeLeft value as off', () => {
    expect(filtersFromSearch('?includeLeft=yes').includeLeft).toBe(false);
  });

  it('falls back to page one when the page is not a number', () => {
    expect(filtersFromSearch('?page=abc').page).toBe(1);
  });

  it('falls back to page one when the page is zero or negative', () => {
    expect(filtersFromSearch('?page=0').page).toBe(1);
    expect(filtersFromSearch('?page=-2').page).toBe(1);
  });

  // Number('2.5') is 2.5, which passes a naive "greater than zero" check.
  it('falls back to page one when the page is not a whole number', () => {
    expect(filtersFromSearch('?page=2.5').page).toBe(1);
  });

  it('ignores a job title or department id that is not a number', () => {
    const filters = filtersFromSearch('?jobTitleId=abc&departmentId=abc');

    expect(filters.jobTitleId).toBeNull();
    expect(filters.departmentId).toBeNull();
  });

  it('reads a sort and direction the API supports', () => {
    const filters = filtersFromSearch('?sort=salary&dir=desc');

    expect(filters.sort).toBe('salary');
    expect(filters.dir).toBe('desc');
  });

  it('ignores a sort column the API does not support', () => {
    expect(filtersFromSearch('?sort=email').sort).toBe('name');
  });

  it('ignores a direction it does not support', () => {
    expect(filtersFromSearch('?dir=sideways').dir).toBe('asc');
  });
});

describe('searchFromFilters', () => {
  it('writes nothing to the URL when everything is at its default', () => {
    expect(searchFromFilters(DEFAULT_FILTERS)).toBe('');
  });

  it('writes only what differs from the default', () => {
    expect(searchFromFilters({ ...DEFAULT_FILTERS, country: 'IN', page: 2 })).toBe(
      'country=IN&page=2',
    );
  });

  it('escapes a search term containing URL characters', () => {
    expect(searchFromFilters({ ...DEFAULT_FILTERS, search: 'rao & co' })).toBe('search=rao+%26+co');
  });

  it('parsing what it wrote gives back the same filters', () => {
    expect(filtersFromSearch(searchFromFilters(filled))).toEqual(filled);
  });
});

describe('withChange', () => {
  // Filtering while on page 25 would otherwise land on a page that no
  // longer exists, and the HR manager sees an empty table.
  it('returns to the first page when a filter changes', () => {
    const result = withChange({ ...DEFAULT_FILTERS, country: 'US', page: 25 }, { country: 'IN' });

    expect(result.country).toBe('IN');
    expect(result.page).toBe(1);
  });

  it('returns to the first page when the sort changes', () => {
    expect(withChange({ ...DEFAULT_FILTERS, page: 5 }, { sort: 'salary' }).page).toBe(1);
  });

  it('returns to the first page when the search changes', () => {
    expect(withChange({ ...DEFAULT_FILTERS, page: 5 }, { search: 'rao' }).page).toBe(1);
  });

  it('keeps the filters and the page when only the page changes', () => {
    const result = withChange({ ...DEFAULT_FILTERS, country: 'IN', page: 25 }, { page: 3 });

    expect(result.country).toBe('IN');
    expect(result.page).toBe(3);
  });
});
