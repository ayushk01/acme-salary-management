import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { AppDatabase } from './connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generated migrations live beside the built output as well as the source,
 * because this resolves the same from `src/db` under the test runner and from
 * `dist/db` in the container.
 */
export const MIGRATIONS_FOLDER = path.resolve(here, '../../drizzle');

export function runMigrations(db: AppDatabase): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
