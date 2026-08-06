import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

const ACTION_COLORS = {
  LOGIN_SUCCESS: 'bg-green-100 text-green-700',
  LOGIN_FAILURE: 'bg-red-100 text-red-700',
  VIEW_RECORD: 'bg-blue-100 text-blue-700',
  EXPORT_RECORD: 'bg-purple-100 text-purple-700',
  ACCOUNT_LOCKED: 'bg-red-100 text-red-700',
  ACCOUNT_UNLOCKED: 'bg-green-100 text-green-700',
  ADMIN_ACTION: 'bg-slate-200 text-slate-700',
  DOCUMENT_UPLOAD: 'bg-cyan-100 text-cyan-700',
  PASSWORD_CHANGE: 'bg-amber-100 text-amber-700',
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api
      .get('/api/security/logs', { params: { page, limit: 20, ...filters } })
      .then((res) => {
        setLogs(res.data.data.logs);
        setTotal(res.data.data.total);
        setPages(res.data.data.pages);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load audit logs'));
  }, [page, filters]);

  useEffect(load, [load]);

  const handleExport = async () => {
    try {
      const res = await api.get('/api/security/logs/export', {
        params: filters,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Could not export audit log');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Every access to student data is recorded. Exporting this log is itself logged.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="rounded-lg bg-dspz-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Export CSV
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <select
            value={filters.action}
            onChange={(e) => {
              setFilters({ ...filters, action: e.target.value });
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All actions</option>
            {Object.keys(ACTION_COLORS).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => {
              setFilters({ ...filters, from: e.target.value });
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              setFilters({ ...filters, to: e.target.value });
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <span className="ml-auto text-sm text-slate-500">{total} entries</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">IP</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-600'}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-2">{l.actorUserId?.fullName || '—'}</td>
                  <td className="px-4 py-2">{l.targetUserId?.fullName || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{l.ipAddress || '—'}</td>
                  <td className="max-w-[220px] truncate px-4 py-2 text-xs text-slate-500">
                    {Object.keys(l.metadata || {}).length ? JSON.stringify(l.metadata) : '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No audit entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex justify-center gap-2 border-t border-slate-200 px-4 py-3">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded bg-slate-100 px-3 py-1 text-xs disabled:opacity-40">
                Prev
              </button>
              <span className="px-2 py-1 text-xs text-slate-500">
                Page {page} of {pages}
              </span>
              <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded bg-slate-100 px-3 py-1 text-xs disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
