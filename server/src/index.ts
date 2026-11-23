import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { createDatabase } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { loadReferenceData } from './db/referenceData.js';

const port = Number(process.env.PORT ?? 3000);
const databasePath = process.env.DATABASE_PATH ?? './data/acme.db';

// Built layout is server/dist/index.js, so the React build sits two levels up.
const here = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(here, '../../web/dist');

// Migrate before listening, so the server never answers a request against a
// half-built database. With no persistent disk this runs on every cold start,
// which is why it is timed: see docs/design.md section 8.
const startedAt = Date.now();

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const { db } = createDatabase(databasePath);
runMigrations(db);
loadReferenceData(db);

console.log(`Database ready at ${databasePath} in ${Date.now() - startedAt}ms`);

// Render sets RENDER_GIT_COMMIT in the container. Reporting it means a
// deploy can be confirmed by reading the live URL, rather than trusting that
// a 200 came from the build we just pushed.
const commit = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'local';

const app = createApp({ staticDir, commit });

app.listen(port, () => {
  console.log(`ACME salary management listening on port ${port}`);
});
