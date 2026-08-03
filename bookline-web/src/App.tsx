import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

type Health = { status: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className='flex min-h-screen items-center justify-center bg-slate-50'>
      <div className='rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200'>
        <h1 className='text-2xl font-semibold text-slate-900'>Bookline</h1>
        <p className='mt-1 text-sm text-slate-500'>
          Appointment booking &amp; staff scheduling
        </p>
        <p className='mt-4 text-sm'>
          {error ? (
            <span className='text-rose-600'>API unreachable — {error}</span>
          ) : health ? (
            <span className='text-emerald-600'>API {health.status}</span>
          ) : (
            <span className='text-slate-400'>checking API…</span>
          )}
        </p>
      </div>
    </div>
  );
}
