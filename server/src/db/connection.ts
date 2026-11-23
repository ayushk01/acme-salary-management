import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema.js';

export interface DatabaseHandle {
  db: ReturnType<typeof drizzle<typeof schema>>;
  sqlite: Database.Database;
  close: () => void;
}

/** The database type the repositories and services are written against. */
export type AppDatabase = DatabaseHandle['db'];

/**
 * Opens a database and applies the pragmas the design depends on.
 *
 * `foreign_keys` is off by default in SQLite, so without this the references
 * declared in the schema would be documentation rather than constraints.
 */
export function createDatabase(filename: string): DatabaseHandle {
  const sqlite = new Database(filename);

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  return { db, sqlite, close: () => sqlite.close() };
}
