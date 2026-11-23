import { Router } from 'express';
import { z } from 'zod';

import type { AppDatabase } from '../db/connection.js';
import { MAX_PAGE_SIZE } from '../domain/paging.js';
import { listEmployees, listReference } from '../services/employeeService.js';
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

export function createApiRouter(db: AppDatabase): Router {
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

  return router;
}
