import { describe, expect, it } from 'vitest';

import { COUNTRIES } from './referenceData.js';
import { countries, employees } from './schema.js';
import { createTestDatabase, insertTestEmployee } from './testDb.js';

describe('the schema', () => {
  it('stores an employee and reads them back', () => {
    const { db, close } = createTestDatabase();

    insertTestEmployee(db, { employeeCode: 'EMP00001', fullName: 'Asha Rao' });
    const stored = db.select().from(employees).get();

    expect(stored?.fullName).toBe('Asha Rao');
    close();
  });

  it('refuses an employee in a country that does not exist', () => {
    const { db, close } = createTestDatabase();

    expect(() => insertTestEmployee(db, { employeeCode: 'EMP00002', countryCode: 'ZZ' })).toThrow(
      /FOREIGN KEY/i,
    );

    close();
  });

  it('refuses a salary that is not positive', () => {
    const { db, close } = createTestDatabase();

    expect(() => insertTestEmployee(db, { employeeCode: 'EMP00003', salaryMinor: 0 })).toThrow(
      /CHECK constraint/i,
    );

    close();
  });

  it('refuses a second employee with the same code', () => {
    const { db, close } = createTestDatabase();

    insertTestEmployee(db, { employeeCode: 'EMP00004' });

    expect(() => insertTestEmployee(db, { employeeCode: 'EMP00004' })).toThrow(/UNIQUE/i);

    close();
  });
});

describe('reference data', () => {
  it('gives every country an ISO currency and a minor unit', () => {
    for (const country of COUNTRIES) {
      expect(country.currencyCode).toMatch(/^[A-Z]{3}$/);
      expect(Number.isInteger(country.currencyMinorUnit)).toBe(true);
    }
  });

  it('records that the yen has no minor units', () => {
    const japan = COUNTRIES.find((country) => country.code === 'JP');

    expect(japan?.currencyMinorUnit).toBe(0);
  });

  it('is loaded into a fresh database', () => {
    const { db, close } = createTestDatabase();

    const stored = db.select().from(countries).all();

    expect(stored).toHaveLength(COUNTRIES.length);
    close();
  });
});
