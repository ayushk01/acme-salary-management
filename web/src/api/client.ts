import { getSessionName } from '../session.js';

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

/** Carries the server's error shape so a form can show it field by field. */
export class ApiError extends Error {
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body;
}

export async function apiGet<T>(path: string): Promise<T> {
  const name = getSessionName();

  const response = await fetch(path, {
    headers: name === '' ? {} : { 'X-Changed-By': name },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(body.error.code, body.error.message, body.error.fields ?? {});
    }
    throw new ApiError('UNEXPECTED', `Request failed with status ${response.status}`);
  }

  return body as T;
}

/** POST/PATCH with the session name attached, since every write must say who. */
export async function apiSend<T>(
  method: 'POST' | 'PATCH',
  path: string,
  body: unknown,
): Promise<T> {
  const name = getSessionName();

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(name === '' ? {} : { 'X-Changed-By': name }),
    },
    body: JSON.stringify(body),
  });

  const parsed: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(parsed)) {
      throw new ApiError(parsed.error.code, parsed.error.message, parsed.error.fields ?? {});
    }
    throw new ApiError('UNEXPECTED', `Request failed with status ${response.status}`);
  }

  return parsed as T;
}
