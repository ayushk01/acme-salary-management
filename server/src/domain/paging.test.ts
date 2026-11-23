import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, offsetFor, pageCount } from './paging.js';

describe('offsetFor', () => {
  it('starts the first page at the beginning', () => {
    expect(offsetFor(1, 20)).toBe(0);
  });

  it('skips the pages before the one asked for', () => {
    expect(offsetFor(3, 20)).toBe(40);
  });
});

describe('pageCount', () => {
  it('counts a part-full last page as a page', () => {
    expect(pageCount(41, 20)).toBe(3);
  });

  it('is no pages when there is nothing to show', () => {
    expect(pageCount(0, 20)).toBe(0);
  });
});

describe('the page size limits', () => {
  it('defaults to twenty, as the requirements say', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('caps what a caller may ask for, so one request cannot pull everything', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});
