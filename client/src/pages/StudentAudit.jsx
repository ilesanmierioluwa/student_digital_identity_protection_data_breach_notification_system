import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const ACTION_COLORS = {
  VIEW_RECORD: 'bg-blue-100 text-blue-700',
  EXPORT_RECORD: 'bg-purple-100 text-purple-700',
  LOGIN_SUCCESS: 'bg-green-100 text-green-700',
  LOGIN_FAILURE: 'bg-red-100 text-red-700',
  ACCOUNT_LOCKED: 'bg-red-100 text-red-700',
  DOCUMENT_UPLOAD: 'bg-cyan-100 text-cyan-700',
};

export default function StudentAudit() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get('/api/security/my-log', { params: { limit: 50 } })
      .then((res) => {
        setLogs(res.data.data.logs);
        setTotal(res.data.data.total);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load audit trail'));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Who accessed my record</h1>
        <p className="mt-1 text-sm text-slate-500">
          Transparency feature: every time an officer or system event touches your data, it is logged here with the actor, IP and time.
        </p>
        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Event</th>
                <th className="px-4 py-2 font-medium">Who</th>
                <th className="px-4 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-600'}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2">{l.actorUserId?.fullName || 'System'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.ipAddress || '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    No access events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400">{total} events in total.</p>
      </main>
    </div>
  );
}
