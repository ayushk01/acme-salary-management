/**
 * A small seeded pseudo-random generator (mulberry32).
 *
 * Hand-written rather than pulled in as a dependency: it is nine lines, and
 * the seed script's whole value rests on being reproducible, so `Math.random`
 * is never an option here.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Whole number in [min, max]. */
    intBetween: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** One item from a non-empty list. */
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    /** True with the given probability. */
    chance: (probability: number) => next() < probability,
  };
}

export interface Random {
  next: () => number;
  intBetween: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
}
