import path from 'node:path';

import express, { type Express } from 'express';

export interface AppOptions {
  /**
   * Directory holding the built React app. Left out in tests, which exercise
   * the API without needing a front end to have been built.
   */
  staticDir?: string;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
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
