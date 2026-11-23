import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Currency hangs off the country, never off the employee. That is what makes
 * it impossible for one country's figures to mix currencies.
 */
export const countries = sqliteTable('countries', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  currencyCode: text('currency_code').notNull(),
  currencyMinorUnit: integer('currency_minor_unit').notNull(),
});

export const jobTitles = sqliteTable('job_titles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const employees = sqliteTable(
  'employees',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    employeeCode: text('employee_code').notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    jobTitleId: integer('job_title_id')
      .notNull()
      .references(() => jobTitles.id),
    departmentId: integer('department_id')
      .notNull()
      .references(() => departments.id),
    countryCode: text('country_code')
      .notNull()
      .references(() => countries.code),
    /** Current salary, in the country's minor units. See docs/design.md §2. */
    salaryMinor: integer('salary_minor').notNull(),
    hireDate: text('hire_date').notNull(),
    status: text('status', { enum: ['active', 'left'] }).notNull(),
    leftDate: text('left_date'),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').notNull(),
    updatedBy: text('updated_by').notNull(),
  },
  (table) => [
    index('employees_country_status_idx').on(table.countryCode, table.status),
    index('employees_job_country_status_idx').on(table.jobTitleId, table.countryCode, table.status),
    index('employees_status_name_idx').on(table.status, table.fullName),
    index('employees_status_salary_idx').on(table.status, table.salaryMinor),
    check('employees_salary_positive', sql`${table.salaryMinor} > 0`),
  ],
);

export const salaryChanges = sqliteTable(
  'salary_changes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id),
    oldSalaryMinor: integer('old_salary_minor').notNull(),
    newSalaryMinor: integer('new_salary_minor').notNull(),
    effectiveDate: text('effective_date').notNull(),
    reason: text('reason', { enum: ['raise', 'promotion', 'correction'] }).notNull(),
    changedBy: text('changed_by').notNull(),
    changedAt: text('changed_at').notNull(),
  },
  (table) => [index('salary_changes_employee_date_idx').on(table.employeeId, table.effectiveDate)],
);
