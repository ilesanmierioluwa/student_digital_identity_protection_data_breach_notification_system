import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const LEVELS = ['ND1', 'ND2', 'HND1', 'HND2'];

export default function Register() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    matricNumber: '',
    departmentId: '',
    level: 'ND1',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get('/api/academic/public/departments')
      .then((res) => setDepartments(res.data.data))
      .catch(() => setError('Could not load departments. Please refresh.'));
  }, []);

  const grouped = departments.reduce((acc, dept) => {
    const schoolName = dept.schoolId?.name || 'Unassigned';
    if (!acc[schoolName]) acc[schoolName] = [];
    acc[schoolName].push(dept);
    return acc;
  }, {});

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', {
        fullName: form.fullName,
        email: form.email,
        matricNumber: form.matricNumber,
        departmentId: form.departmentId,
        level: form.level,
        password: form.password,
      });
      navigate('/verify-otp', {
        state: { email: form.email, purpose: 'register', message: res.data.message },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dspz-navy via-slate-900 to-dspz-blue px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-800">Student Registration</h1>
          <p className="text-sm text-slate-500">Delta State Polytechnic, Otefe-Oghara</p>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input
              type="text"
              name="fullName"
              required
              value={form.fullName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Matric number</label>
            <input
              type="text"
              name="matricNumber"
              required
              value={form.matricNumber}
              onChange={handleChange}
              placeholder="e.g. ND/2024/CSC/001"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Level</label>
            <select
              name="level"
              value={form.level}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select
              name="departmentId"
              required
              value={form.departmentId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            >
              <option value="">Select your department</option>
              {Object.entries(grouped).map(([school, depts]) => (
                <optgroup key={school} label={school}>
                  {depts.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} — {school}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-dspz-navy py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-dspz-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
