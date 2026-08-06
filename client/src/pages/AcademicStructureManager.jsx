import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function AcademicStructureManager() {
  const [schools, setSchools] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [schoolForm, setSchoolForm] = useState({ name: '', code: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', schoolId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    Promise.all([api.get('/api/academic/schools'), api.get('/api/academic/departments')])
      .then(([s, d]) => {
        setSchools(s.data.data);
        setDepartments(d.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load academic structure'));
  };

  useEffect(load, []);

  const handleSchoolSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/api/academic/schools', schoolForm);
      setSchoolForm({ name: '', code: '' });
      setMessage('School created successfully.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create school');
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/api/academic/departments', deptForm);
      setDeptForm({ name: '', code: '', schoolId: deptForm.schoolId });
      setMessage('Department created successfully.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create department');
    }
  };

  const toggleSchool = async (school) => {
    try {
      await api.put(`/api/academic/schools/${school._id}`, { isActive: !school.isActive });
      setMessage(school.isActive ? 'School deactivated. Its departments now need review.' : 'School activated.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const toggleDept = async (dept) => {
    try {
      await api.put(`/api/academic/departments/${dept._id}`, { isActive: !dept.isActive });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const schoolById = (id) => schools.find((s) => s._id === id);
  const reviewDepartments = departments.filter((d) => d.needsReview);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Academic Structure Manager</h1>
        <p className="mt-1 text-sm text-slate-500">
          Schools and Departments must be set up before students can register. Students only select from these.
        </p>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

        {reviewDepartments.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <h3 className="font-semibold text-amber-800">Needs review ({reviewDepartments.length})</h3>
            <p className="mt-1 text-sm text-amber-700">
              These departments belong to a school that was deactivated. Review each one.
            </p>
            <ul className="mt-2 space-y-1">
              {reviewDepartments.map((d) => (
                <li key={d._id} className="flex items-center justify-between text-sm">
                  <span>
                    {d.name} ({d.code})
                  </span>
                  <button
                    onClick={() =>
                      api
                        .put(`/api/academic/departments/${d._id}`, { needsReview: false })
                        .then(load)
                        .catch((err) => setError(err.response?.data?.message))
                    }
                    className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Resolve
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Create School</h2>
            <form onSubmit={handleSchoolSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="School name, e.g. School of Applied Sciences"
                required
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
              />
              <input
                type="text"
                placeholder="Code, e.g. SAS"
                required
                maxLength={12}
                value={schoolForm.code}
                onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
              />
              <button className="w-full rounded-lg bg-dspz-navy py-2 font-semibold text-white hover:opacity-90">
                Add School
              </button>
            </form>

            <div className="mt-6">
              <h3 className="font-semibold text-slate-700">Existing schools</h3>
              <ul className="mt-2 space-y-2">
                {schools.map((s) => (
                  <li key={s._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {s.name} <span className="text-xs text-slate-400">({s.code})</span>
                      </p>
                      <p className={`text-xs ${s.isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {s.isActive ? 'Active' : 'Deactivated'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleSchool(s)}
                      className={`rounded px-3 py-1 text-xs font-semibold ${
                        s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {s.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                ))}
                {schools.length === 0 && <p className="text-sm text-slate-400">No schools yet.</p>}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Create Department</h2>
            <form onSubmit={handleDeptSubmit} className="mt-4 space-y-3">
              <select
                required
                value={deptForm.schoolId}
                onChange={(e) => setDeptForm({ ...deptForm, schoolId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
              >
                <option value="">Select school</option>
                {schools.filter((s) => s.isActive).map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Department name, e.g. Computer Science"
                required
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
              />
              <input
                type="text"
                placeholder="Code, e.g. CSC"
                required
                maxLength={12}
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
              />
              <button className="w-full rounded-lg bg-dspz-navy py-2 font-semibold text-white hover:opacity-90">
                Add Department
              </button>
            </form>

            <div className="mt-6">
              <h3 className="font-semibold text-slate-700">Existing departments</h3>
              <ul className="mt-2 space-y-2">
                {departments.map((d) => (
                  <li key={d._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {d.name} <span className="text-xs text-slate-400">({d.code})</span>
                      </p>
                      <p className="text-xs text-slate-500">{schoolById(d.schoolId?._id)?.name || '—'}</p>
                      {d.needsReview && <span className="text-xs font-semibold text-amber-600">Needs review</span>}
                    </div>
                    <button
                      onClick={() => toggleDept(d)}
                      className={`rounded px-3 py-1 text-xs font-semibold ${
                        d.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                ))}
                {departments.length === 0 && <p className="text-sm text-slate-400">No departments yet.</p>}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
