/**
 * A failure the caller can do something about, carrying the status and code
 * the API should return. Anything else is a bug and becomes a 500.
 */
export class ServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
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
