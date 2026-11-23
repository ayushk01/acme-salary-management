import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import type { DatabaseHandle } from './db/connection.js';
import { createTestDatabase } from './db/testDb.js';

let handle: DatabaseHandle;

beforeEach(() => {
  handle = createTestDatabase();
});

afterEach(() => {
  handle.close();
});

describe('GET /api/health', () => {
  it('reports that the server is up', async () => {
    const response = await request(createApp({ db: handle.db })).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  // Without this, a failed deploy is invisible from outside: the previous
  // container keeps serving and every endpoint answers exactly as before.
  it('reports the build it is running', async () => {
    const response = await request(createApp({ db: handle.db, commit: 'abc1234' })).get(
      '/api/health',
    );

    expect(response.body.commit).toBe('abc1234');
  });

  it('reports a local build when no commit was supplied', async () => {
    const response = await request(createApp({ db: handle.db })).get('/api/health');

    expect(response.body.commit).toBe('local');
  });

  // With no persistent disk the database is rebuilt on every cold start, so
  // this is a live measurement of the budget in docs/design.md section 8,
  // readable from the deployed URL rather than only from a local run.
  it('reports how long the database took to get ready', async () => {
    const response = await request(createApp({ db: handle.db, databaseMs: 327 })).get(
      '/api/health',
    );

    expect(response.body.databaseMs).toBe(327);
  });

  it('omits the database timing when it was not measured', async () => {
    const response = await request(createApp({ db: handle.db })).get('/api/health');

    expect(response.body.databaseMs).toBeUndefined();
  });
});

describe('an unknown API route', () => {
  it('is a 404 rather than falling through to the React app', async () => {
    const response = await request(createApp({ db: handle.db })).get('/api/does-not-exist');

    expect(response.status).toBe(404);
  });
});
