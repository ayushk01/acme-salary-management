import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;

const clock = { todayIso: () => '2026-11-24', nowIso: () => '2026-11-24T09:00:00.000Z' };
const app = () => createApp({ db: handle.db, clock });
const WHO = 'Ayush';

const raise = (salaryMinor: number, effectiveDate: string) =>
  request(app())
    .patch('/api/employees/EMP00001')
    .set('X-Changed-By', WHO)
    .send({ salaryMinor, salaryReason: 'raise', salaryEffectiveDate: effectiveDate });

beforeEach(() => {
  handle = createTestDatabase();
  insertTestEmployee(handle.db, {
    employeeCode: 'EMP00001',
    fullName: 'Asha Rao',
    countryCode: 'IN',
    salaryMinor: 1_000_000,
  });
  insertTestEmployee(handle.db, { employeeCode: 'EMP00002', fullName: 'Ravi Menon' });
});

afterEach(() => {
  handle.close();
});

describe('GET /api/employees/:code/salary-history', () => {
  // Two changes can share an effective date, so the tie has to break the
  // same way every time or the list reorders itself between page loads.
  it('returns changes newest first, breaking ties by which was recorded last', async () => {
    await raise(1_100_000, '2026-05-01');
    await raise(1_200_000, '2026-05-01');
    await raise(1_300_000, '2026-03-01');

    const response = await request(app()).get('/api/employees/EMP00001/salary-history');

    expect(response.status).toBe(200);
    expect(
      response.body.rows.map(
        (row: { newSalary: { amountMinor: number } }) => row.newSalary.amountMinor,
      ),
    ).toEqual([1_200_000, 1_100_000, 1_300_000]);
  });

  it('carries the old and new amounts, the date, the reason and who made it', async () => {
    await raise(1_100_000, '2026-05-01');

    const response = await request(app()).get('/api/employees/EMP00001/salary-history');
    const row = response.body.rows[0];

    expect(row.oldSalary).toEqual({ amountMinor: 1_000_000, currency: 'INR', minorUnit: 2 });
    expect(row.newSalary).toEqual({ amountMinor: 1_100_000, currency: 'INR', minorUnit: 2 });
    expect(row.effectiveDate).toBe('2026-05-01');
    expect(row.reason).toBe('raise');
    expect(row.changedBy).toBe(WHO);
  });

  it('is an empty list, not an error, for someone whose pay has never changed', async () => {
    const response = await request(app()).get('/api/employees/EMP00002/salary-history');

    expect(response.status).toBe(200);
    expect(response.body.rows).toEqual([]);
  });

  it('is a 404 for an employee code that does not exist', async () => {
    const response = await request(app()).get('/api/employees/EMP99999/salary-history');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

describe('the employee summary', () => {
  // Most of the 10,000 have never had a salary change, so without this
  // "who last touched this record" has no answer for them at all.
  it('says who last changed the record and when', async () => {
    await raise(1_100_000, '2026-05-01');

    const response = await request(app()).get('/api/employees?search=EMP00001');

    expect(response.body.rows[0].updatedBy).toBe(WHO);
    expect(response.body.rows[0].updatedAt).toBe('2026-11-24T09:00:00.000Z');
  });
});
