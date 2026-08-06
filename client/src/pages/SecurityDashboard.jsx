import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import api from '../services/api';

const SEVERITY_COLORS = { low: 'bg-slate-100 text-slate-700', medium: 'bg-amber-100 text-amber-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' };
const STATUS_COLORS = { open: 'bg-red-100 text-red-800', investigating: 'bg-orange-100 text-orange-800', contained: 'bg-blue-100 text-blue-800', notified: 'bg-purple-100 text-purple-800', resolved: 'bg-green-100 text-green-800' };
const TYPE_LABELS = {
  MULTIPLE_FAILED_LOGINS: 'Multiple failed logins',
  LOGIN_NEW_LOCATION: 'Login from new location',
  IMPOSSIBLE_TRAVEL: 'Impossible travel',
  BULK_EXPORT_ATTEMPT: 'Bulk export attempt',
  OFF_HOURS_ACCESS: 'Off-hours access',
  REFRESH_TOKEN_REUSE: 'Refresh token reuse',
};

function Heatmap({ heatmap }) {
  const max = Math.max(1, ...heatmap.map((h) => h.count));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-800">Failed logins — last 24h (by hour, UTC)</h3>
      <div className="mt-4 flex h-32 items-end gap-1">
        {heatmap.map((h) => (
          <div key={h.hour} className="group relative flex-1">
            <div
              className="w-full rounded-t bg-dspz-navy transition hover:bg-dspz-blue"
              style={{ height: `${h.count === 0 ? 4 : Math.max(8, (h.count / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
              {String(h.hour).padStart(2, '0')}:00 — {h.count}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Hover a bar for the exact count.</p>
    </div>
  );
}

function OverviewTab({ data, onRefresh }) {
  if (!data) return null;
  const anomalyTypes = Object.entries(data.anomalyByType || {});
  const severities = Object.entries(data.incidentBySeverity || {});
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Open incidents" value={data.openIncidents} accent="text-red-600" />
        <StatCard label="Unreviewed anomalies" value={data.unreviewedAnomalies} accent="text-amber-600" />
        <StatCard label="Active sessions" value={data.activeSessions} />
        <StatCard label="Failed logins (24h)" value={data.failedLogins24h} accent="text-red-600" />
        <StatCard label="Successful logins (24h)" value={data.loginSuccess24h} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Heatmap heatmap={data.failedLoginHeatmap} />
        <div className="grid gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">Anomalies by type</h3>
            {anomalyTypes.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No anomalies recorded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {anomalyTypes.map(([type, count]) => (
                  <li key={type} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{TYPE_LABELS[type] || type}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800">Incidents by severity</h3>
            {severities.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No incidents recorded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {severities.map(([sev, count]) => (
                  <li key={sev} className="flex items-center justify-between text-sm">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[sev] || 'bg-slate-100 text-slate-700'}`}>{sev}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', affectedEmails: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback((p = 1) => {
    api.get('/api/security/incidents', { params: { page: p, limit: 10 } }).then((res) => {
      setIncidents(res.data.data.incidents);
      setTotal(res.data.data.total);
    }).catch(() => {});
  }, []);

  useEffect(() => load(page), [load, page]);

  const createIncident = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/api/security/incidents', {
        title: form.title,
        description: form.description,
        severity: form.severity,
        affectedEmails: form.affectedEmails ? form.affectedEmails.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      setMessage('Breach incident created.');
      setForm({ title: '', description: '', severity: 'medium', affectedEmails: '' });
      setPage(1);
      load(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create incident');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/security/incidents/${id}/status`, { status });
      load(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
        <h3 className="font-semibold text-slate-800">Create breach incident (manual)</h3>
        <p className="mt-1 text-xs text-slate-500">e.g. reported by a third party, or a lost staff laptop.</p>
        {message && <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={createIncident} className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Title (e.g. Lost staff laptop)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Description of what happened"
            rows="3"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          >
            {['low', 'medium', 'high', 'critical'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Affected student emails (comma-separated)"
            value={form.affectedEmails}
            onChange={(e) => setForm({ ...form, affectedEmails: e.target.value })}
          />
          <button className="w-full rounded-lg bg-dspz-navy px-4 py-2 text-sm font-semibold text-white hover:bg-dspz-blue">
            Create incident
          </button>
        </form>
      </div>

      <div className="lg:col-span-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Incident</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Affected</th>
                <th className="px-4 py-3">Detected</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incidents.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-400">No incidents found.</td></tr>
              )}
              {incidents.map((i) => (
                <tr key={i._id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{i.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-1">{i.description}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[i.severity]}`}>{i.severity}</span></td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[i.status]}`}>{i.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{i.detectionMethod}</td>
                  <td className="px-4 py-3 text-slate-600">{i.affectedUserIds.length}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(i.detectedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                      value={i.status}
                      onChange={(e) => updateStatus(i._id, e.target.value)}
                    >
                      {['open', 'investigating', 'contained', 'notified', 'resolved'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>{total} incident(s)</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1">Page {page}</span>
            <button
              disabled={page * 10 >= total}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnomaliesTab() {
  const [flags, setFlags] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);

  const load = useCallback((p = 1) => {
    const params = { page: p, limit: 20 };
    if (onlyUnreviewed) params.reviewed = 'false';
    api.get('/api/security/anomalies', { params }).then((res) => {
      setFlags(res.data.data.flags);
      setTotal(res.data.data.total);
    }).catch(() => {});
  }, [onlyUnreviewed]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load, onlyUnreviewed]);

  const review = async (id) => {
    await api.put(`/api/security/anomalies/${id}/reviewed`);
    load(page);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} anomaly flag(s)</p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyUnreviewed} onChange={(e) => setOnlyUnreviewed(e.target.checked)} />
          Only unreviewed
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {flags.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-400">No anomaly flags found.</td></tr>
            )}
            {flags.map((f) => (
              <tr key={f._id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{f.userId?.fullName || 'Deleted user'}</p>
                  <p className="text-xs text-slate-400">{f.userId?.matricNumber || ''}</p>
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-700">{TYPE_LABELS[f.type] || f.type}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${f.score >= 80 ? 'bg-red-100 text-red-800' : f.score >= 50 ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'}`}>
                    {f.score}
                  </span>
                </td>
                <td className="max-w-xs px-4 py-3">
                  <pre className="truncate text-xs text-slate-500">{JSON.stringify(f.details)}</pre>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(f.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{f.reviewed ? <span className="text-green-600">reviewed</span> : <span className="text-amber-600">unreviewed</span>}</td>
                <td className="px-4 py-3">
                  {!f.reviewed && (
                    <button
                      onClick={() => review(f._id)}
                      className="rounded-lg bg-dspz-navy px-3 py-1 text-xs font-medium text-white hover:bg-dspz-blue"
                    >
                      Mark reviewed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>{total} flag(s)</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40">Prev</button>
          <span className="px-2 py-1">Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => load(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [cfg, setCfg] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/security/config').then((res) => setCfg(res.data.data)).catch(() => {});
  }, []);

  if (!cfg) return <p className="text-sm text-slate-400">Loading configuration…</p>;

  const fields = [
    ['failedLoginLimit', 'Failed logins before lockout'],
    ['lockoutDurationMinutes', 'Lockout duration (minutes)'],
    ['anomalyEscalationThreshold', 'Anomaly escalation threshold (score)'],
    ['bulkAccessThreshold', 'Bulk access threshold (record views)'],
    ['bulkAccessWindowMinutes', 'Bulk access window (minutes)'],
    ['offHoursStart', 'Off-hours window start (hour 0–23 UTC)'],
    ['offHoursEnd', 'Off-hours window end (hour 0–23 UTC)'],
    ['impossibleTravelKmThreshold', 'Impossible travel distance (km)'],
    ['impossibleTravelMinutesWindow', 'Impossible travel time window (minutes)'],
    ['scanIntervalMinutes', 'Anomaly scan interval (minutes)'],
  ];

  const update = async (key, value) => {
    setError('');
    try {
      await api.put('/api/security/config', { [key]: value });
      setMessage(`Updated ${key}.`);
      const res = await api.get('/api/security/config');
      setCfg(res.data.data);
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800">Breach detection thresholds</h3>
        <p className="mt-1 text-xs text-slate-500">
          Changes apply immediately. The anomaly engine and lockout logic read these values on every event.
        </p>
        {message && <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 space-y-3">
          {fields.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-slate-600">{label}</label>
              <input
                type="number"
                className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={cfg[key]}
                onChange={(e) => setCfg({ ...cfg, [key]: e.target.value })}
                onBlur={() => update(key, cfg[key])}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SecurityDashboard() {
  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);

  const loadDashboard = useCallback(() => {
    api.get('/api/security/dashboard').then((res) => setDashboard(res.data.data)).catch(() => {});
  }, []);

  useEffect(loadDashboard, [loadDashboard]);

  const tabs = [
    ['overview', 'Overview'],
    ['incidents', 'Incidents'],
    ['anomalies', 'Anomalies'],
    ['settings', 'Settings'],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Security Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Risk heatmap, flagged anomalies, and open breach incidents.</p>
          </div>
          <button onClick={loadDashboard} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Refresh
          </button>
        </div>

        <div className="mt-6 flex gap-1 border-b border-slate-200">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-dspz-navy bg-white text-dspz-navy' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'overview' && <OverviewTab data={dashboard} onRefresh={loadDashboard} />}
          {tab === 'incidents' && <IncidentsTab />}
          {tab === 'anomalies' && <AnomaliesTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
