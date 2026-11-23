/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReferenceLists } from '../api/types.js';
import { EmployeeForm } from './EmployeeForm.js';

afterEach(cleanup);

const reference: ReferenceLists = {
  countries: [{ code: 'IN', name: 'India', currencyCode: 'INR', currencyMinorUnit: 2 }],
  jobTitles: [{ id: 1, name: 'SDE2' }],
  departments: [{ id: 1, name: 'Engineering' }],
};

describe('EmployeeForm', () => {
  it('shows a field error from the server beside that field', () => {
    render(
      <EmployeeForm
        reference={reference}
        errors={{ salaryMinor: 'Must be a positive whole number.' }}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('Must be a positive whole number.')).toBeDefined();
  });

  // The field holds rupees, the API takes paise. Getting this wrong by a
  // factor of a hundred is the mistake integer minor units exist to prevent.
  it('converts the salary to minor units before saving', () => {
    const onSave = vi.fn();

    render(<EmployeeForm reference={reference} errors={{}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Employee code'), { target: { value: 'EMP09001' } });
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Nadia Khan' } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'nadia.khan@acme.example' },
    });
    fireEvent.change(screen.getByLabelText('Hire date'), { target: { value: '2024-04-01' } });
    fireEvent.change(screen.getByLabelText('Salary'), { target: { value: '1250000' } });
    fireEvent.submit(screen.getByTestId('employee-form'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ salaryMinor: 125_000_000, employeeCode: 'EMP09001' }),
    );
  });
});
