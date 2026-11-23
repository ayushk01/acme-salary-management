import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError, apiGet, apiSend } from '../api/client.js';
import type { EmployeeListResult, EmployeeSummary, ReferenceLists } from '../api/types.js';
import { localDateIso } from '../dates.js';
import { type EmployeeInput, EmployeeForm } from './EmployeeForm.js';

/** Serves both adding and editing: the only difference is whether a code exists. */
export function EmployeeFormPage({ editing }: { editing: boolean }) {
  const { code } = useParams();
  const navigate = useNavigate();

  const [reference, setReference] = useState<ReferenceLists | null>(null);
  const [existing, setExisting] = useState<EmployeeSummary | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leftDate, setLeftDate] = useState('');

  useEffect(() => {
    apiGet<ReferenceLists>('/api/reference')
      .then(setReference)
      .catch(() => setReference(null));
  }, []);

  useEffect(() => {
    if (!editing || code === undefined) {
      return;
    }
    apiGet<EmployeeListResult>(`/api/employees?includeLeft=true&search=${encodeURIComponent(code)}`)
      .then((page) => setExisting(page.rows.find((row) => row.employeeCode === code) ?? null))
      .catch(() => setMessage('Could not load this employee.'));
  }, [code, editing]);

  const report = (caught: unknown) => {
    if (caught instanceof ApiError) {
      setErrors(caught.fields);
      setMessage(caught.message);
      return;
    }
    setMessage('Something went wrong.');
  };

  const save = (values: EmployeeInput) => {
    setSaving(true);
    setErrors({});
    setMessage(null);

    const request = editing
      ? apiSend<EmployeeSummary>('PATCH', `/api/employees/${code ?? ''}`, {
          fullName: values.fullName,
          email: values.email,
          jobTitleId: values.jobTitleId,
          departmentId: values.departmentId,
          countryCode: values.countryCode,
          salaryMinor: values.salaryMinor,
          salaryReason: values.salaryReason ?? 'correction',
          // The user's calendar date, not the server's. See docs/design.md §3.
          salaryEffectiveDate: localDateIso(),
        })
      : apiSend<EmployeeSummary>('POST', '/api/employees', values);

    request
      .then((saved) => navigate(`/employees?search=${saved.employeeCode}`))
      .catch(report)
      .finally(() => setSaving(false));
  };

  const markAsLeft = () => {
    if (leftDate === '') {
      setMessage('Pick the date they left.');
      return;
    }
    apiSend<EmployeeSummary>('POST', `/api/employees/${code ?? ''}/leave`, { leftDate })
      .then(() => navigate('/employees'))
      .catch(report);
  };

  if (reference === null || (editing && existing === null && message === null)) {
    return (
      <main>
        <p>{'Loading…'}</p>
      </main>
    );
  }

  return (
    <main className="narrow">
      <p>
        <Link to="/employees">&larr; Back to the list</Link>
      </p>
      <h1>{editing ? `Edit ${code ?? ''}` : 'Add an employee'}</h1>

      {message !== null && <p className="error">{message}</p>}

      {reference !== null && (
        <EmployeeForm
          reference={reference}
          errors={errors}
          onSave={save}
          editing={editing}
          saving={saving}
          initial={
            existing === null
              ? undefined
              : {
                  employeeCode: existing.employeeCode,
                  fullName: existing.fullName,
                  email: existing.email,
                  countryCode: existing.country.code,
                  salaryMinor: existing.salary.amountMinor,
                  hireDate: existing.hireDate,
                }
          }
        />
      )}

      {editing && existing?.status === 'active' && (
        <section className="leaving">
          <h2>Mark as left</h2>
          <p className="hint">
            Nothing is deleted. They leave the active list and every statistic, and their record and
            salary history stay.
          </p>
          <div className="field">
            <label htmlFor="leftDate">Last day</label>
            <input
              id="leftDate"
              type="date"
              value={leftDate}
              onChange={(event) => setLeftDate(event.target.value)}
            />
          </div>
          <button type="button" onClick={markAsLeft}>
            Mark as left
          </button>
        </section>
      )}

      {editing && existing?.status === 'left' && (
        <p className="hint">
          This employee left on {existing.leftDate}, so their record is read-only.
        </p>
      )}
    </main>
  );
}
