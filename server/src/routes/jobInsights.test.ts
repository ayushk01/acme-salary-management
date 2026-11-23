import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { jobTitles } from '../db/schema.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;
let sde2: number;
let nextCode = 1;

const app = () => createApp({ db: handle.db });

const add = (
  countryCode: string,
  salaries: number[],
  status: 'active' | 'left' = 'active',
): void => {
  for (const salaryMinor of salaries) {
    nextCode += 1;
    insertTestEmployee(handle.db, {
      employeeCode: `EMP${String(nextCode).padStart(5, '0')}`,
      countryCode,
      jobTitleId: sde2,
      salaryMinor,
      status,
      leftDate: status === 'left' ? '2026-01-01' : null,
    });
  }
};

const rowFor = (body: { rows: { country: { code: string } }[] }, code: string) =>
  body.rows.find((row) => row.country.code === code);

beforeEach(() => {
  handle = createTestDatabase();
  nextCode = 1;
  sde2 =
    handle.db
      .select()
      .from(jobTitles)
      .all()
      .find((title) => title.name === 'SDE2')?.id ?? 1;

  add('IN', [100, 200, 300]);
  add('US', [1000, 2000]);
  add('JP', [5000]);
});

afterEach(() => {
  handle.close();
});

describe('GET /api/insights/job/:id', () => {
  it('returns one row per country where the job exists, by country name', async () => {
    const response = await request(app()).get(`/api/insights/job/${sde2}`);

    expect(response.status).toBe(200);
    expect(
      response.body.rows.map((row: { country: { code: string } }) => row.country.code),
    ).toEqual(['IN', 'JP', 'US']);
  });

  it('leaves out a country with nobody active in that job', async () => {
    const response = await request(app()).get(`/api/insights/job/${sde2}`);

    expect(rowFor(response.body, 'DE')).toBeUndefined();
  });

  it('gives each row its own country currency', async () => {
    const response = await request(app()).get(`/api/insights/job/${sde2}`);

    expect(rowFor(response.body, 'JP')).toMatchObject({ currency: 'JPY', minorUnit: 0 });
  });

  // Without PARTITION BY, every country would report the global figures and
  // each row would claim a maximum of 5000. A single-country test would not
  // notice.
  it('keeps the figures per country rather than combining them', async () => {
    const response = await request(app()).get(`/api/insights/job/${sde2}`);

    expect(rowFor(response.body, 'IN')).toMatchObject({
      headcount: 3,
      min: 100,
      max: 300,
      average: 200,
      median: 200,
    });
    expect(rowFor(response.body, 'US')).toMatchObject({
      headcount: 2,
      min: 1000,
      max: 2000,
      average: 1500,
      median: 1500,
    });
  });

  it('counts people who have left towards nothing', async () => {
    add('IN', [9_000_000], 'left');

    const response = await request(app()).get(`/api/insights/job/${sde2}`);

    expect(rowFor(response.body, 'IN')).toMatchObject({ headcount: 3, max: 300 });
  });

  it('is a 404 for a job title that does not exist', async () => {
    const response = await request(app()).get('/api/insights/job/9999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
