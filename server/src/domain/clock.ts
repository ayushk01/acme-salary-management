/**
 * Time is injected rather than read from `Date` directly, so "the effective
 * date defaults to today" is something a test can assert instead of having
 * to run at the right moment.
 */
export interface Clock {
  todayIso(): string;
  nowIso(): string;
}

export const systemClock: Clock = {
  todayIso: () => new Date().toISOString().slice(0, 10),
  nowIso: () => new Date().toISOString(),
};
