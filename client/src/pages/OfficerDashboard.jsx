import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      api.get('/api/officers/students', { params: { page, limit: 10, search } }),
      api.get('/api/officers/profile-changes/pending'),
    ])
      .then(([list, p]) => {
        setStudents(list.data.data.students);
        setTotal(list.data.data.total);
        setPages(list.data.data.pages);
        setPending(p.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load students'));
  }, [page, search]);

  useEffect(load, [load]);

  const viewRecord = async (id) => {
    try {
      const res = await api.get(`/api/officers/students/${id}`);
      setSelected(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not view record');
    }
  };

  const verify = async (id) => {
    try {
      await api.post(`/api/officers/students/${id}/verify`);
      setMessage('Student profile verified');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify');
    }
  };

  const review = async (id, decision) => {
    try {
      await api.post(`/api/officers/profile-changes/${id}/review`, { decision, notes: 'Reviewed by department officer' });
      setMessage(`Request ${decision}d`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not review request');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Department Records Office</h1>
        <p className="mt-1 text-sm text-slate-500">
          You can only access student records within your assigned department. Every view is logged.
        </p>

        {message && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Students in dept" value={total} />
          <StatCard label="Pending change requests" value={pending.length} accent="text-amber-600" />
          <StatCard label="Verified" value={students.filter((s) => s.profileVerified).length} />
        </div>

        {pending.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <h3 className="font-semibold text-amber-800">Pending identity change requests</h3>
            <ul className="mt-2 space-y-2">
              {pending.map((r) => (
                <li key={r._id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                  <span>
                    <strong>{r.userId?.fullName}</strong> ({r.userId?.matricNumber}) requested:{' '}
                    {Object.keys(r.requestedChanges).join(', ')}
                  </span>
                  <span className="flex gap-2">
                    <button
                      onClick={() => review(r._id, 'approve')}
                      className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(r._id, 'reject')}
                      className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Reject
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-800">Department students</h2>
            <input
              type="text"
              placeholder="Search name / matric / email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">Matric</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Level</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-t border-slate-100">
                  <td className="px-5 py-2 font-mono text-xs">{s.matricNumber}</td>
                  <td className="px-5 py-2">{s.fullName}</td>
                  <td className="px-5 py-2">{s.level}</td>
                  <td className="px-5 py-2">
                    {s.profileVerified ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Verified</span>
                    ) : s.profileNeedsVerification ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Needs review</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-2">
                    <button onClick={() => viewRecord(s._id)} className="rounded bg-dspz-navy px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
                      View
                    </button>
                    {!s.profileVerified && (
                      <button onClick={() => verify(s._id)} className="ml-2 rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:opacity-90">
                        Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex justify-center gap-2 border-t border-slate-200 px-5 py-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded bg-slate-100 px-3 py-1 text-xs font-medium disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-xs text-slate-500">
                Page {page} of {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
                className="rounded bg-slate-100 px-3 py-1 text-xs font-medium disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelected(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selected.student.fullName}</h3>
                  <p className="font-mono text-xs text-slate-500">{selected.student.matricNumber}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ['Email', selected.student.email],
                  ['Level', selected.student.level],
                  ['Department', selected.department?.name],
                  ['School', selected.department?.schoolId?.name],
                  ['Phone', selected.phone || '—'],
                  ['Email verified', selected.student.isEmailVerified ? 'Yes' : 'No'],
                  ['Profile verified', selected.student.profileVerified ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-100 pb-1">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
              {selected.student.photoUrl && (
                <img src={selected.student.photoUrl} alt="Student" className="mx-auto mt-4 h-24 w-24 rounded-full object-cover" />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
