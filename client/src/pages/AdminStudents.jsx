import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [officerForm, setOfficerForm] = useState({ fullName: '', email: '', departmentId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newOfficer, setNewOfficer] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      api.get('/api/admin/students', { params: { page, limit: 10, search } }),
      api.get('/api/admin/officers'),
      api.get('/api/academic/departments'),
    ])
      .then(([s, o, d]) => {
        setStudents(s.data.data.students);
        setTotal(s.data.data.total);
        setPages(s.data.data.pages);
        setOfficers(o.data.data.officers);
        setDepartments(d.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load data'));
  }, [page, search]);

  useEffect(load, [load]);

  const handleCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/api/admin/students/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
      if (res.data.data?.errors?.length) {
        setError(res.data.data.errors.slice(0, 5).map((x) => `Row ${x.row}: ${x.reason}`).join(' | '));
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    }
  };

  const createOfficer = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.post('/api/admin/officers', officerForm);
      setNewOfficer(res.data.data);
      setMessage(res.data.message);
      setOfficerForm({ fullName: '', email: '', departmentId: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create officer');
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await api.put(`/api/admin/students/${id}/active`, {
        isActive: !isActive,
        reason: !isActive ? 'Admin action' : '',
      });
      setMessage(!isActive ? 'Student deactivated (data retained)' : 'Student reactivated');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Student & Staff Management</h1>
        <p className="mt-1 text-sm text-slate-500">Manage student records and department officers.</p>

        {message && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {newOfficer && (
          <div className="mt-4 rounded-lg border border-dspz-blue bg-blue-50 px-4 py-3 text-sm text-dspz-navy">
            <strong>Officer created:</strong> {newOfficer.fullName} ({newOfficer.email})
            <br />
            Temporary password (change on first login): <code className="font-mono">{newOfficer.tempPassword}</code>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Students ({total})</h2>
              <input
                type="text"
                placeholder="Search students"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-dspz-blue focus:outline-none"
              />
            </div>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Matric</th>
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Dept</th>
                  <th className="py-2 font-medium">Level</th>
                  <th className="py-2 font-medium">Active</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s._id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs">{s.matricNumber}</td>
                    <td className="py-2">{s.fullName}</td>
                    <td className="py-2 text-xs">{s.departmentId?.code || '—'}</td>
                    <td className="py-2 text-xs">{s.level}</td>
                    <td className="py-2">{s.isActive ? 'Yes' : 'No'}</td>
                    <td className="py-2">
                      <button
                        onClick={() => toggleActive(s._id, s.isActive)}
                        className={`rounded px-3 py-1 text-xs font-semibold ${
                          s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="mt-3 flex justify-center gap-2">
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

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Bulk import students (CSV)</h2>
              <p className="mt-1 text-xs text-slate-500">
                Columns: <code>fullName,email,matricNumber,department,level</code>. Department must be an existing code.
              </p>
              <label className="mt-3 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-dspz-blue">
                <input type="file" accept=".csv,text/csv" onChange={handleCsv} className="hidden" />
                Click to choose CSV file
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Create department officer</h2>
              <form onSubmit={createOfficer} className="mt-3 space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  required
                  value={officerForm.fullName}
                  onChange={(e) => setOfficerForm({ ...officerForm, fullName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dspz-blue focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={officerForm.email}
                  onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dspz-blue focus:outline-none"
                />
                <select
                  required
                  value={officerForm.departmentId}
                  onChange={(e) => setOfficerForm({ ...officerForm, departmentId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-dspz-blue focus:outline-none"
                >
                  <option value="">Assign department</option>
                  {departments.filter((d) => d.isActive).map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
                <button className="w-full rounded-lg bg-dspz-navy py-2 text-sm font-semibold text-white hover:opacity-90">
                  Create officer
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Department officers ({officers.length})</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {officers.map((o) => (
                  <li key={o._id} className="flex justify-between border-b border-slate-100 py-1">
                    <span>{o.fullName}</span>
                    <span className="text-xs text-slate-500">{o.departmentId?.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
