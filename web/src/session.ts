const STORAGE_KEY = 'acme.changedBy';

/**
 * Who is making changes. There is no login in v1, so the name is typed once
 * and kept for the session, then sent with every write as X-Changed-By.
 *
 * Storage is wrapped because it throws in a private window rather than
 * returning nothing, and an unreadable name should not break the page.
 */
export function getSessionName(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setSessionName(name: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Nothing useful to do: the name simply will not survive a reload.
  }
}
