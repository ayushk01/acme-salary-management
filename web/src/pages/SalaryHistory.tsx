import type { EmployeeSummary, SalaryHistoryRow } from '../api/types.js';
import { formatMoney, localeForCountry } from '../money.js';

const REASON_LABELS: Record<SalaryHistoryRow['reason'], string> = {
  raise: 'Raise',
  promotion: 'Promotion',
  correction: 'Correction',
};

/**
 * What an employee earns and how it got there. Together with "last changed
 * by", this is the whole of what the product promises about who changed what:
 * a per-field audit log was deliberately not built.
 */
export function SalaryHistory({
  employee,
  rows,
}: {
  employee: EmployeeSummary;
  rows: SalaryHistoryRow[];
}) {
  const locale = localeForCountry(employee.country.code);

  return (
    <section className="history">
      <h2>Salary history</h2>

      <p className="hint">
        Now on <strong>{formatMoney(employee.salary, locale)}</strong>. Last changed by{' '}
        {employee.updatedBy} on {employee.updatedAt.slice(0, 10)}.
      </p>

      {rows.length === 0 ? (
        <p className="hint">No changes since this employee was added.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Effective</th>
              <th className="right">From</th>
              <th className="right">To</th>
              <th>Reason</th>
              <th>Changed by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.changedAt}-${row.effectiveDate}-${row.newSalary.amountMinor}`}>
                <td>{row.effectiveDate}</td>
                <td className="right">{formatMoney(row.oldSalary, locale)}</td>
                <td className="right">{formatMoney(row.newSalary, locale)}</td>
                <td>{REASON_LABELS[row.reason]}</td>
                <td>{row.changedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
