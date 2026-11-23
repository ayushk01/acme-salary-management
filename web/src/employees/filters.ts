export type SortColumn = 'name' | 'salary';
export type SortDirection = 'asc' | 'desc';

export interface ListFilters {
  search: string;
  country: string;
  jobTitleId: number | null;
  departmentId: number | null;
  includeLeft: boolean;
  sort: SortColumn;
  dir: SortDirection;
  page: number;
}

export const DEFAULT_FILTERS: ListFilters = {
  search: '',
  country: '',
  jobTitleId: null,
  departmentId: null,
  includeLeft: false,
  sort: 'name',
  dir: 'asc',
  page: 1,
};

const SORT_COLUMNS: readonly string[] = ['name', 'salary'];
const SORT_DIRECTIONS: readonly string[] = ['asc', 'desc'];

/**
 * A page number is only usable if it is a whole number above zero.
 * `Number('2.5')` is 2.5, which passes a naive "greater than zero" check and
 * then asks the API for a fractional page.
 */
function pageFrom(raw: string | null): number {
  if (raw === null) {
    return 1;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function idFrom(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * The URL is the single source of truth for what the list is showing, so
 * anything that arrives in it is treated as untrusted: a sort column the API
 * does not have, or a direction that is not asc or desc, falls back to the
 * default rather than reaching the server.
 */
export function filtersFromSearch(search: string): ListFilters {
  const params = new URLSearchParams(search);
  const sort = params.get('sort');
  const dir = params.get('dir');

  return {
    search: params.get('search') ?? '',
    country: params.get('country') ?? '',
    jobTitleId: idFrom(params.get('jobTitleId')),
    departmentId: idFrom(params.get('departmentId')),
    includeLeft: params.get('includeLeft') === 'true',
    sort: sort !== null && SORT_COLUMNS.includes(sort) ? (sort as SortColumn) : 'name',
    dir: dir !== null && SORT_DIRECTIONS.includes(dir) ? (dir as SortDirection) : 'asc',
    page: pageFrom(params.get('page')),
  };
}

/**
 * Only values that differ from the default are written, so a plain list has a
 * clean URL and a shared link carries exactly what the sender was looking at.
 *
 * Keys are emitted in a fixed order so the same filters always produce the
 * same string.
 */
export function searchFromFilters(filters: ListFilters): string {
  const params = new URLSearchParams();

  if (filters.search !== DEFAULT_FILTERS.search) {
    params.set('search', filters.search);
  }
  if (filters.country !== DEFAULT_FILTERS.country) {
    params.set('country', filters.country);
  }
  if (filters.jobTitleId !== null) {
    params.set('jobTitleId', String(filters.jobTitleId));
  }
  if (filters.departmentId !== null) {
    params.set('departmentId', String(filters.departmentId));
  }
  if (filters.includeLeft) {
    params.set('includeLeft', 'true');
  }
  if (filters.sort !== DEFAULT_FILTERS.sort) {
    params.set('sort', filters.sort);
  }
  if (filters.dir !== DEFAULT_FILTERS.dir) {
    params.set('dir', filters.dir);
  }
  if (filters.page !== DEFAULT_FILTERS.page) {
    params.set('page', String(filters.page));
  }

  return params.toString();
}

/**
 * Applies a change to the filters.
 *
 * Anything other than a page change returns to the first page: a narrower
 * filter usually has fewer pages, so filtering while on page 25 would
 * otherwise land on a page that no longer exists and show an empty table.
 * A change that touches both wins on the filter, and still resets.
 */
export function withChange(filters: ListFilters, change: Partial<ListFilters>): ListFilters {
  const keys = Object.keys(change);
  const onlyPageChanged = keys.length > 0 && keys.every((key) => key === 'page');

  return {
    ...filters,
    ...change,
    page: onlyPageChanged ? (change.page ?? filters.page) : 1,
  };
}
