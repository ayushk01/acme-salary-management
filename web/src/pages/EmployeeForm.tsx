import { type FormEvent, useState } from 'react';

import type { ReferenceLists } from '../api/types.js';
import { minorUnitsToDecimalString } from '../money.js';

export interface EmployeeInput {
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitleId: number;
  departmentId: number;
  countryCode: string;
  salaryMinor: number;
  hireDate: string;
  salaryReason?: 'raise' | 'promotion' | 'correction';
}

export interface EmployeeFormProps {
  reference: ReferenceLists;
  errors: Record<string, string>;
  onSave: (values: EmployeeInput) => void;
  initial?: Partial<EmployeeInput> & { countryCode?: string };
  /** An existing employee keeps their code; a new one is given one. */
  editing?: boolean;
  saving?: boolean;
}

/** Labels are tied to inputs by id so the error text never becomes part of a field's name. */
function FieldError({ message }: { message?: string }) {
  return message === undefined ? null : <span className="field-error">{message}</span>;
}

export function EmployeeForm({
  reference,
  errors,
  onSave,
  initial = {},
  editing = false,
  saving = false,
}: EmployeeFormProps) {
  const firstCountry = reference.countries[0]?.code ?? '';
  const [countryCode, setCountryCode] = useState(initial.countryCode ?? firstCountry);
  const country = reference.countries.find((item) => item.code === countryCode);
  const minorUnit = country?.currencyMinorUnit ?? 2;

  const [employeeCode, setEmployeeCode] = useState(initial.employeeCode ?? '');
  const [fullName, setFullName] = useState(initial.fullName ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [jobTitleId, setJobTitleId] = useState(
    initial.jobTitleId ?? reference.jobTitles[0]?.id ?? 1,
  );
  const [departmentId, setDepartmentId] = useState(
    initial.departmentId ?? reference.departments[0]?.id ?? 1,
  );
  const [hireDate, setHireDate] = useState(initial.hireDate ?? '');
  const [salaryText, setSalaryText] = useState(
    initial.salaryMinor === undefined
      ? ''
      : minorUnitsToDecimalString(initial.salaryMinor, minorUnit),
  );
  const [salaryReason, setSalaryReason] = useState<'raise' | 'promotion' | 'correction'>('raise');

  const submit = (event: FormEvent) => {
    event.preventDefault();

    // The field holds major units - what HR types - and the API takes minor
    // units. Rounding after the shift keeps a typed "12500.50" exact.
    const salaryMinor = Math.round(Number(salaryText) * 10 ** minorUnit);

    onSave({
      employeeCode,
      fullName,
      email,
      jobTitleId,
      departmentId,
      countryCode,
      salaryMinor,
      hireDate,
      ...(editing ? { salaryReason } : {}),
    });
  };

  return (
    <form className="employee-form" data-testid="employee-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="employeeCode">Employee code</label>
        <input
          id="employeeCode"
          value={employeeCode}
          readOnly={editing}
          placeholder="EMP00001"
          onChange={(event) => setEmployeeCode(event.target.value)}
        />
        <FieldError message={errors.employeeCode} />
      </div>

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <FieldError message={errors.fullName} />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FieldError message={errors.email} />
      </div>

      <div className="field">
        <label htmlFor="jobTitleId">Job title</label>
        <select
          id="jobTitleId"
          value={jobTitleId}
          onChange={(event) => setJobTitleId(Number(event.target.value))}
        >
          {reference.jobTitles.map((title) => (
            <option key={title.id} value={title.id}>
              {title.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.jobTitleId} />
      </div>

      <div className="field">
        <label htmlFor="departmentId">Department</label>
        <select
          id="departmentId"
          value={departmentId}
          onChange={(event) => setDepartmentId(Number(event.target.value))}
        >
          {reference.departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.departmentId} />
      </div>

      <div className="field">
        <label htmlFor="countryCode">Country</label>
        <select
          id="countryCode"
          value={countryCode}
          disabled={editing}
          onChange={(event) => setCountryCode(event.target.value)}
        >
          {reference.countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        {editing && (
          <span className="hint">
            An employee cannot be moved to another country: it would change their currency and make
            their salary history incomparable.
          </span>
        )}
        <FieldError message={errors.countryCode} />
      </div>

      <div className="field">
        <label htmlFor="salary">Salary</label>
        <input
          id="salary"
          inputMode="decimal"
          value={salaryText}
          placeholder={`Annual gross in ${country?.currencyCode ?? ''}`}
          onChange={(event) => setSalaryText(event.target.value)}
        />
        <FieldError message={errors.salaryMinor} />
      </div>

      {editing && (
        <div className="field">
          <label htmlFor="salaryReason">Reason for a salary change</label>
          <select
            id="salaryReason"
            value={salaryReason}
            onChange={(event) =>
              setSalaryReason(event.target.value as 'raise' | 'promotion' | 'correction')
            }
          >
            <option value="raise">Raise</option>
            <option value="promotion">Promotion</option>
            <option value="correction">Correction</option>
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="hireDate">Hire date</label>
        <input
          id="hireDate"
          type="date"
          value={hireDate}
          onChange={(event) => setHireDate(event.target.value)}
        />
        <FieldError message={errors.hireDate} />
      </div>

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
