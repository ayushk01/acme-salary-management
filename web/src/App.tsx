import { useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { CountryOverviewPage } from './pages/CountryOverviewPage.js';
import { EmployeeFormPage } from './pages/EmployeeFormPage.js';
import { EmployeesPage } from './pages/EmployeesPage.js';
import { JobOverviewPage } from './pages/JobOverviewPage.js';
import { getSessionName, setSessionName } from './session.js';

/**
 * There is no login in v1, so changes are attributed to a name the user
 * types once. Asking before the list appears keeps every later write
 * attributable without a prompt interrupting the work.
 */
function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <main className="narrow">
      <h1>ACME Salary Management</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (trimmed !== '') {
            setSessionName(trimmed);
            onDone(trimmed);
          }
        }}
      >
        <label>
          Your name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="So changes can be attributed"
            autoFocus
          />
        </label>
        <button type="submit" disabled={name.trim() === ''}>
          Continue
        </button>
      </form>
    </main>
  );
}

export function App() {
  const [name, setName] = useState(getSessionName);

  if (name === '') {
    return <NamePrompt onDone={setName} />;
  }

  return (
    <BrowserRouter>
      <nav className="top">
        <NavLink to="/employees">Employees</NavLink>
        <NavLink to="/insights/country">Pay by country</NavLink>
        <NavLink to="/insights/job">Pay by job title</NavLink>
        <span className="who">Signed in as {name}</span>
      </nav>
      <Routes>
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/new" element={<EmployeeFormPage editing={false} />} />
        <Route path="/employees/:code/edit" element={<EmployeeFormPage editing />} />
        <Route path="/insights/country" element={<CountryOverviewPage />} />
        <Route path="/insights/job" element={<JobOverviewPage />} />
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
