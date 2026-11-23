import path from 'node:path';

import express, { type Express } from 'express';

export interface AppOptions {
  /**
   * Directory holding the built React app. Left out in tests, which exercise
   * the API without needing a front end to have been built.
   */
  staticDir?: string;
  /**
   * Short identifier of the build being served, reported by the health
   * endpoint so a deploy can be verified from outside.
   */
  commit?: string;
  /**
   * Milliseconds spent on migrations, reference data and the seed at boot.
   * Reported so the cold-start budget can be checked on the deployed URL.
   */
  databaseMs?: number;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.use(express.json());

  const commit = options.commit ?? 'local';
  const { databaseMs } = options;

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', commit, ...(databaseMs === undefined ? {} : { databaseMs }) });
  });

  const { staticDir } = options;
  if (staticDir !== undefined) {
    app.use(express.static(staticDir));

    // The React app owns client-side routing, so any GET that is not an API
    // call and not a real file is handed index.html. Anything under /api/ is
    // deliberately excluded: an unknown endpoint must 404, not quietly return
    // HTML that a fetch() would then fail to parse.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
}
