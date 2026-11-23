import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;

beforeEach(() => {
  handle = createTestDatabase();
  insertTestEmployee(handle.db, {
    employeeCode: 'EMP00001',
    fullName: 'Asha Rao',
    countryCode: 'IN',
    salaryMinor: 1_250_000,
  });
});

afterEach(() => {
  handle.close();
});

const app = () => createApp({ db: handle.db });

describe('GET /api/employees', () => {
  it('returns the page envelope the UI needs to show "1-20 of n"', async () => {
    const response = await request(app()).get('/api/employees');

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
    expect(response.body.total).toBe(1);
    expect(response.body.rows).toHaveLength(1);
  });

  it('gives money as minor units with its currency, never a formatted string', async () => {
    const response = await request(app()).get('/api/employees');

    expect(response.body.rows[0].salary).toEqual({
      amountMinor: 1_250_000,
      currency: 'INR',
      minorUnit: 2,
    });
  });

  it('rejects a sort field it does not support', async () => {
    const response = await request(app()).get('/api/employees?sort=salary; DROP TABLE employees');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.fields.sort).toBeTruthy();
  });

  it('refuses a page size that would pull the whole table', async () => {
    const response = await request(app()).get('/api/employees?pageSize=5000');

    expect(response.status).toBe(400);
    expect(response.body.error.fields.pageSize).toBeTruthy();
  });
});

describe('GET /api/reference', () => {
  it('returns the fixed lists the dropdowns are built from', async () => {
    const response = await request(app()).get('/api/reference');

    expect(response.status).toBe(200);
    expect(response.body.countries.length).toBeGreaterThan(0);
    expect(response.body.jobTitles.length).toBeGreaterThan(0);
    expect(response.body.departments.length).toBeGreaterThan(0);
  });

  it('gives each country its currency, so the UI never guesses', () => {
    return request(app())
      .get('/api/reference')
      .then((response) => {
        const india = response.body.countries.find(
          (country: { code: string }) => country.code === 'IN',
        );
        expect(india.currencyCode).toBe('INR');
        expect(india.currencyMinorUnit).toBe(2);
      });
  });
});
