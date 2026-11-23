/**
 * A failure the caller can do something about, carrying the status and code
 * the API should return. Anything else is a bug and becomes a 500.
 */
export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;
  /** Optional per-field messages, so a form can show the reason in place. */
  readonly fields: Record<string, string> | undefined;

  constructor(code: string, status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export const duplicateEmployeeCode = (code: string): ServiceError =>
  new ServiceError('DUPLICATE_EMPLOYEE_CODE', 409, `Employee code ${code} is already in use.`);

export const employeeNotFound = (code: string): ServiceError =>
  new ServiceError('NOT_FOUND', 404, `No employee with code ${code}.`);

export const employeeHasLeft = (code: string): ServiceError =>
  new ServiceError(
    'EMPLOYEE_HAS_LEFT',
    409,
    `Employee ${code} has left, so their record is read-only.`,
  );

/**
 * Moving an employee between countries changes their currency, which makes
 * their salary history incomparable. Out of scope in v1, so it is refused
 * rather than half-supported.
 */
export const countryChangeNotSupported = (): ServiceError =>
  new ServiceError(
    'COUNTRY_CHANGE_NOT_SUPPORTED',
    409,
    'Moving an employee between countries is not supported.',
    { countryCode: 'An employee cannot be moved to another country.' },
  );
