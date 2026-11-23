/** What the requirements ask for: twenty rows a page. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * The largest page a caller may ask for. Without a cap, `pageSize=10000`
 * would quietly undo server-side paging and hand the browser everything.
 */
export const MAX_PAGE_SIZE = 100;

export function offsetFor(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

export function pageCount(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}
