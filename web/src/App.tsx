import { useEffect, useState } from 'react';

type Health = 'checking' | 'ok' | 'unreachable';

/**
 * Placeholder shell for slice 1. Its only job is to prove the deployed
 * container serves the React build and can reach its own API. The employee
 * list and routing arrive in later slices.
 */
export function App() {
  const [health, setHealth] = useState<Health>('checking');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('bad status'))))
      .then((body: { status?: string }) => {
        if (!cancelled) {
          setHealth(body.status === 'ok' ? 'ok' : 'unreachable');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth('unreachable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5 }}>
      <h1>ACME Salary Management</h1>
      <p>Deployment check for slice 1. The employee list arrives in a later slice.</p>
      <p>
        API: <strong>{health}</strong>
      </p>
    </main>
  );
}
