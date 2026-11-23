import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;

const app = () => createApp({ db: handle.db });

const csv = async (query = ''): Promise<string> => {
  const response = await request(app()).get(`/api/employees.csv${query}`);
  expect(response.status).toBe(200);
  return response.text;
};

/** Lines without the byte order mark, so assertions read plainly. */
const linesOf = (text: string): string[] => text.replace(/^﻿/, '').trim().split('\r\n');

beforeEach(() => {
  handle = createTestDatabase();
});

afterEach(() => {
  handle.close();
});

describe('GET /api/employees.csv', () => {
  it('names every column in the header row', async () => {
    const text = await csv();

    expect(linesOf(text)[0]).toBe(
      'Employee code,Full name,Email,Job title,Department,Country,Salary,Currency,Status,Hire date,Last day',
    );
  });

  it('exports every matching row, not just the page the list would show', async () => {
    for (let index = 1; index <= 25; index += 1) {
      insertTestEmployee(handle.db, { employeeCode: `EMP${String(index).padStart(5, '0')}` });
    }

    const rows = linesOf(await csv('?pageSize=20')).slice(1);

    expect(rows).toHaveLength(25);
  });

  it('applies the same filters as the list', async () => {
    insertTestEmployee(handle.db, { employeeCode: 'EMP00001', countryCode: 'IN' });
    insertTestEmployee(handle.db, { employeeCode: 'EMP00002', countryCode: 'US' });

    const rows = linesOf(await csv('?country=IN')).slice(1);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('EMP00001');
  });

  // Excel has to see a number it can total and sort, not a string with a
  // currency symbol and thousands separators in it.
  it('writes the salary as a plain number with the currency beside it', async () => {
    insertTestEmployee(handle.db, { employeeCode: 'EMP00001', countryCode: 'IN', salaryMinor: 1_250_000 });

    const row = linesOf(await csv())[1] ?? '';

    expect(row).toContain(',12500.00,INR,');
  });

  it('gives a currency without minor units no decimal point', async () => {
    insertTestEmployee(handle.db, { employeeCode: 'EMP00001', countryCode: 'JP', salaryMinor: 8_000_000 });

    const row = linesOf(await csv())[1] ?? '';

    expect(row).toContain(',8000000,JPY,');
  });

  // The seeded names are clean, so a naive fields.join(',') passes every
  // other test here and silently corrupts the one row that needs quoting.
  it('keeps a name containing a comma or a quote in one field', async () => {
    insertTestEmployee(handle.db, {
      employeeCode: 'EMP00001',
      fullName: 'Rao, Asha "A"',
    });

    const row = linesOf(await csv())[1] ?? '';

    expect(row).toContain('"Rao, Asha ""A"""');
  });

  // Without the mark Excel reads UTF-8 as the local codepage and mangles
  // every non-ASCII name - and the seed is full of them.
  it('starts with a byte order mark and ends its lines the way Excel expects', async () => {
    const text = await csv();

    expect(text.startsWith('﻿')).toBe(true);
    expect(text).toContain('\r\n');
  });
});
