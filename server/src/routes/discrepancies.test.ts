import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { jobTitles } from '../db/schema.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;
let sde2: number;
let sde3: number;
let nextCode = 1;

const app = () => createApp({ db: handle.db });

const titleId = (name: string): number =>
  handle.db
    .select()
    .from(jobTitles)
    .all()
    .find((title) => title.name === name)?.id ?? 1;

const add = (
  jobTitleId: number,
  salaries: number[],
  status: 'active' | 'left' = 'active',
): void => {
  for (const salaryMinor of salaries) {
    nextCode += 1;
    insertTestEmployee(handle.db, {
      employeeCode: `EMP${String(nextCode).padStart(5, '0')}`,
      countryCode: 'IN',
      jobTitleId,
      salaryMinor,
      status,
      leftDate: status === 'left' ? '2026-01-01' : null,
    });
  }
};

const discrepancies = async (): Promise<{
  rows: { employeeCode: string; salary: number; median: number; percentFromMedian: number }[];
}> => {
  const response = await request(app()).get('/api/insights/discrepancies?country=IN');
  expect(response.status).toBe(200);
  return response.body;
};

beforeEach(() => {
  handle = createTestDatabase();
  nextCode = 1;
  sde2 = titleId('SDE2');
  sde3 = titleId('SDE3');
});

afterEach(() => {
  handle.close();
});

describe('GET /api/insights/discrepancies', () => {
  it('lists someone paid well above their group median', async () => {
    add(sde2, [1_000_000, 1_000_000, 1_000_000, 1_000_000, 2_000_000]);

    const body = await discrepancies();

    expect(body.rows.map((row) => row.salary)).toEqual([2_000_000]);
  });

  // The acceptance criteria say the rule is *more than* 25%, so the boundary
  // itself is inside the range.
  it('leaves out someone exactly the threshold above the median', async () => {
    add(sde2, [1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_250_000]);

    expect((await discrepancies()).rows).toEqual([]);
  });

  it('lists someone one minor unit past the threshold', async () => {
    add(sde2, [1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_250_001]);

    expect((await discrepancies()).rows.map((row) => row.salary)).toEqual([1_250_001]);
  });

  // Both branches of the rule need a test: an upper-only implementation
  // passes everything above and quietly never flags anyone underpaid.
  it('lists someone paid well below the median, with a negative percentage', async () => {
    add(sde2, [500_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000]);

    const body = await discrepancies();

    expect(body.rows.map((row) => row.salary)).toEqual([500_000]);
    expect(body.rows[0]?.percentFromMedian).toBe(-50);
  });

  // A group of one sits exactly on its own median; a handful is barely more
  // meaningful. Below the minimum the group is not judged at all.
  it('skips a group smaller than the minimum size entirely', async () => {
    add(sde3, [1_000_000, 1_000_000, 1_000_000, 3_000_000]);

    expect((await discrepancies()).rows).toEqual([]);
  });

  // The leaver here would pull the median from 1,000,000 to 2,500,000 if it
  // were counted, which would flag all six people instead of two.
  it('counts people who have left towards nothing', async () => {
    add(sde2, [1_000_000, 1_000_000, 1_000_000, 4_000_000, 4_000_000]);
    add(sde2, [4_000_000], 'left');

    const body = await discrepancies();

    expect(body.rows).toHaveLength(2);
    expect(body.rows[0]?.median).toBe(1_000_000);
  });

  it('carries the group median and how far off it each person is', async () => {
    add(sde2, [1_000_000, 1_000_000, 1_000_000, 1_000_000, 2_000_000]);

    const body = await discrepancies();

    expect(body.rows[0]?.median).toBe(1_000_000);
    expect(body.rows[0]?.percentFromMedian).toBe(100);
  });
});
