import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);

// Built layout is server/dist/index.js, so the React build sits two levels up.
const here = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(here, '../../web/dist');

const app = createApp({ staticDir });

app.listen(port, () => {
  console.log(`ACME salary management listening on port ${port}`);
});
