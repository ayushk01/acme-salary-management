import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import type { DatabaseHandle } from '../db/connection.js';
import { employees, salaryChanges } from '../db/schema.js';
import { createTestDatabase, insertTestEmployee } from '../db/testDb.js';

let handle: DatabaseHandle;

/** Fixed, so "defaults to today" is a value a test can assert. */
const clock = { todayIso: () => '2026-11-24', nowIso: () => '2026-11-24T09:00:00.000Z' };

const app = () => createApp({ db: handle.db, clock });

const WHO = 'Ayush';

const newEmployee = {
  employeeCode: 'EMP09001',
  fullName: 'Nadia Khan',
  email: 'nadia.khan@acme.example',
  jobTitleId: 1,
  departmentId: 1,
  countryCode: 'IN',
  salaryMinor: 1_800_000,
  hireDate: '2024-04-01',
};

const changesFor = (code: string) => {
  const employee = handle.db
    .select()
    .from(employees)
    .all()
    .find((row) => row.employeeCode === code);
  return handle.db
    .select()
    .from(salaryChanges)
    .all()
    .filter((row) => row.employeeId === employee?.id);
};

const stored = (code: string) =>
  handle.db
    .select()
    .from(employees)
    .all()
    .find((row) => row.employeeCode === code);

beforeEach(() => {
  handle = createTestDatabase();
  insertTestEmployee(handle.db, {
    employeeCode: 'EMP00001',
    fullName: 'Asha Rao',
    countryCode: 'IN',
    salaryMinor: 1_000_000,
  });
});

afterEach(() => {
  handle.close();
});

describe('POST /api/employees', () => {
  it('creates the employee and shows them in the list', async () => {
    const created = await request(app())
      .post('/api/employees')
      .set('X-Changed-By', WHO)
      .send(newEmployee);

    expect(created.status).toBe(201);
    expect(created.body.employeeCode).toBe('EMP09001');

    const list = await request(app()).get('/api/employees?search=EMP09001');
    expect(list.body.total).toBe(1);
    expect(list.body.rows[0].fullName).toBe('Nadia Khan');
  });

  it('rejects a salary that is not a positive whole number', async () => {
    const response = await request(app())
      .post('/api/employees')
      .set('X-Changed-By', WHO)
      .send({ ...newEmployee, salaryMinor: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error.fields.salaryMinor).toBeTruthy();
  });

  it('rejects an employee code that is already taken', async () => {
    const response = await request(app())
      .post('/api/employees')
      .set('X-Changed-By', WHO)
      .send({ ...newEmployee, employeeCode: 'EMP00001' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('DUPLICATE_EMPLOYEE_CODE');
  });

  it('refuses a write that does not say who made it', async () => {
    const response = await request(app()).post('/api/employees').send(newEmployee);

    expect(response.status).toBe(400);
    expect(response.body.error.fields['x-changed-by']).toBeTruthy();
  });
});

describe('PATCH /api/employees/:code', () => {
  it('records the salary change and updates the employee together', async () => {
    const response = await request(app())
      .patch('/api/employees/EMP00001')
      .set('X-Changed-By', WHO)
      .send({ salaryMinor: 1_200_000, salaryReason: 'raise' });

    expect(response.status).toBe(200);
    expect(stored('EMP00001')?.salaryMinor).toBe(1_200_000);

    const changes = changesFor('EMP00001');
    expect(changes).toHaveLength(1);
    expect(changes[0]?.oldSalaryMinor).toBe(1_000_000);
    expect(changes[0]?.newSalaryMinor).toBe(1_200_000);
    expect(changes[0]?.changedBy).toBe(WHO);
    expect(changes[0]?.effectiveDate).toBe('2026-11-24');
  });

  it('records no salary change when the salary did not change', async () => {
    await request(app())
      .patch('/api/employees/EMP00001')
      .set('X-Changed-By', WHO)
      .send({ fullName: 'Asha Rao-Menon' });

    expect(stored('EMP00001')?.fullName).toBe('Asha Rao-Menon');
    expect(changesFor('EMP00001')).toHaveLength(0);
  });

  it('refuses to edit someone who has left', async () => {
    await request(app())
      .post('/api/employees/EMP00001/leave')
      .set('X-Changed-By', WHO)
      .send({ leftDate: '2026-10-01' });

    const response = await request(app())
      .patch('/api/employees/EMP00001')
      .set('X-Changed-By', WHO)
      .send({ fullName: 'Nope' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMPLOYEE_HAS_LEFT');
  });
});

describe('POST /api/employees/:code/leave', () => {
  it('records the leaving date and drops them from the list', async () => {
    const response = await request(app())
      .post('/api/employees/EMP00001/leave')
      .set('X-Changed-By', WHO)
      .send({ leftDate: '2026-10-01' });

    expect(response.status).toBe(200);
    expect(stored('EMP00001')?.status).toBe('left');
    expect(stored('EMP00001')?.leftDate).toBe('2026-10-01');

    const list = await request(app()).get('/api/employees');
    expect(list.body.total).toBe(0);
  });
});
