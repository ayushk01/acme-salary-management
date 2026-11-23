import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;
let nextCode = 1;

const app = () => createApp({ db: handle.db });

/** Adds people on the given salaries, in the given country. */
const add = (countryCode: string, salaries: number[], status: 'active' | 'left' = 'active') => {
  for (const salaryMinor of salaries) {
    nextCode += 1;
    insertTestEmployee(handle.db, {
      employeeCode: `EMP${String(nextCode).padStart(5, '0')}`,
      countryCode,
      salaryMinor,
      status,
      leftDate: status === 'left' ? '2026-01-01' : null,
    });
  }
};

beforeEach(() => {
  handle = createTestDatabase();
  nextCode = 1;
});

afterEach(() => {
  handle.close();
});

describe('GET /api/insights/country/:code', () => {
  it('takes the middle salary as the median of an odd group', async () => {
    add('IN', [100, 200, 300, 400, 500]);

    const response = await request(app()).get('/api/insights/country/IN');

    expect(response.body.median).toBe(300);
  });

  // SQLite rounds half away from zero, so a median of 1,150,000.5 goes up
  // while this group's average of 1,150,000.25 goes down. Both land on a
  // whole minor unit, which is what the currency can actually represent.
  it('averages the two middle salaries of an even group and rounds', async () => {
    add('IN', [1_000_000, 1_100_000, 1_200_001, 1_300_000]);

    const response = await request(app()).get('/api/insights/country/IN');

    expect(response.body.median).toBe(1_150_001);
    expect(response.body.average).toBe(1_150_000);
  });

  it('counts people who have left towards nothing', async () => {
    add('IN', [100, 200, 300]);
    add('IN', [9_000_000], 'left');

    const response = await request(app()).get('/api/insights/country/IN');

    expect(response.body.headcount).toBe(3);
    expect(response.body.max).toBe(300);
    expect(response.body.median).toBe(200);
  });

  it('returns the headcount, lowest, highest and average beside the median', async () => {
    add('IN', [100, 200, 300, 400, 500]);

    const response = await request(app()).get('/api/insights/country/IN');

    expect(response.body.headcount).toBe(5);
    expect(response.body.min).toBe(100);
    expect(response.body.max).toBe(500);
    expect(response.body.average).toBe(300);
  });

  it('reports the figures in that country own currency', async () => {
    add('JP', [8_000_000]);

    const response = await request(app()).get('/api/insights/country/JP');

    expect(response.body.currency).toBe('JPY');
    expect(response.body.minorUnit).toBe(0);
  });

  // A reviewer will click every country in the dropdown, and a null reaching
  // the formatter is a blank screen rather than an honest "nobody here".
  it('is an empty country, not an error, when nobody is active there', async () => {
    const response = await request(app()).get('/api/insights/country/DE');

    expect(response.status).toBe(200);
    expect(response.body.headcount).toBe(0);
    expect(response.body.median).toBeNull();
    expect(response.body.average).toBeNull();
  });

  it('is a 404 for a country we do not employ anyone in', async () => {
    const response = await request(app()).get('/api/insights/country/ZZ');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
