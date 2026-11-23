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
