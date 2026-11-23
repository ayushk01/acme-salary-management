import type { ZodError } from 'zod';

/**
 * Every error the API returns has this shape, so the UI has one thing to
 * handle rather than one per endpoint.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

/** Turns zod's issue list into one message per field. */
export function validationError(error: ZodError): ApiErrorBody {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.') || 'request';
    // First issue per field wins: one clear message beats a pile of them.
    fields[field] ??= issue.message;
  }

  return {
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Some of the values sent were not valid.',
      fields,
    },
  };
}

export function notFound(message: string): ApiErrorBody {
  return { error: { code: 'NOT_FOUND', message } };
}
