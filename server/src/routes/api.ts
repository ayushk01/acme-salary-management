import { type Request, type Response, Router } from 'express';
import { z } from 'zod';

import type { AppDatabase } from '../db/connection.js';
import type { Clock } from '../domain/clock.js';
import { MAX_PAGE_SIZE } from '../domain/paging.js';
import { listEmployees, listReference, listSalaryHistory } from '../services/employeeService.js';
import {
  createEmployee,
  editEmployee,
  markEmployeeAsLeft,
} from '../services/employeeWriteService.js';
import { ServiceError } from '../services/serviceError.js';
import { validationError } from './errors.js';

/**
 * Query strings arrive as text, so everything is coerced and checked here at
 * the boundary. Nothing past this point has to wonder whether `page` is a
 * number or whether `sort` is a column name someone invented.
 */
const listQuery = z.object({
  search: z.string().trim().optional(),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, 'Must be a two letter country code')
    .optional(),
  jobTitleId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  includeLeft: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  sort: z.enum(['name', 'salary']).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE, `Must be ${MAX_PAGE_SIZE} or fewer`)
    .optional(),
});

const salaryMinor = z
  .number()
  .int('Must be a positive whole number')
  .positive('Must be a positive whole number');

const newEmployee = z.object({
  employeeCode: z.string().regex(/^EMP\d{5}$/, 'Must look like EMP00001'),
  fullName: z.string().trim().min(1, 'Required'),
  email: z.email('Must be an email address'),
  jobTitleId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  countryCode: z.string().regex(/^[A-Z]{2}$/, 'Must be a two letter country code'),
  salaryMinor,
  hireDate: z.iso.date('Must be a date like 2026-01-31'),
});

const employeeEdit = z.object({
  fullName: z.string().trim().min(1, 'Required').optional(),
  email: z.email('Must be an email address').optional(),
  jobTitleId: z.number().int().positive().optional(),
  departmentId: z.number().int().positive().optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/, 'Must be a two letter country code')
    .optional(),
  salaryMinor: salaryMinor.optional(),
  salaryReason: z.enum(['raise', 'promotion', 'correction']).optional(),
  salaryEffectiveDate: z.iso.date('Must be a date like 2026-01-31').optional(),
});

const leaving = z.object({
  leftDate: z.iso.date('Must be a date like 2026-01-31'),
});

/**
 * There is no login, so the name the user typed is the only attribution a
 * change will ever have. A write without it is refused rather than recorded
 * as having come from nobody.
 */
function changedByFrom(req: Request, res: Response): string | null {
  const header = req.get('X-Changed-By')?.trim() ?? '';

  if (header === '') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Every change has to say who made it.',
        fields: { 'x-changed-by': 'Required' },
      },
    });
    return null;
  }

  return header;
}

function handleServiceError(error: unknown, res: Response): void {
  if (error instanceof ServiceError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  throw error;
}

export function createApiRouter(db: AppDatabase, clock: Clock): Router {
  const router = Router();

  router.get('/employees', (req, res) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    const { country, ...rest } = parsed.data;
    res.json(listEmployees(db, { ...rest, countryCode: country }));
  });

  router.get('/reference', (_req, res) => {
    res.json(listReference(db));
  });

  router.get('/employees/:code/salary-history', (req, res) => {
    try {
      res.json(listSalaryHistory(db, req.params.code));
    } catch (error) {
      handleServiceError(error, res);
    }
  });

  router.post('/employees', (req, res) => {
    const changedBy = changedByFrom(req, res);
    if (changedBy === null) {
      return;
    }

    const parsed = newEmployee.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      res.status(201).json(createEmployee(db, clock, parsed.data, changedBy));
    } catch (error) {
      handleServiceError(error, res);
    }
  });

  router.patch('/employees/:code', (req, res) => {
    const changedBy = changedByFrom(req, res);
    if (changedBy === null) {
      return;
    }

    const parsed = employeeEdit.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      res.json(editEmployee(db, clock, req.params.code, parsed.data, changedBy));
    } catch (error) {
      handleServiceError(error, res);
    }
  });

  router.post('/employees/:code/leave', (req, res) => {
    const changedBy = changedByFrom(req, res);
    if (changedBy === null) {
      return;
    }

    const parsed = leaving.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      res.json(markEmployeeAsLeft(db, clock, req.params.code, parsed.data.leftDate, changedBy));
    } catch (error) {
      handleServiceError(error, res);
    }
  });

  return router;
}
