import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const forced = user?.mustChangePassword;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setInfo('Password changed successfully.');
      setTimeout(() => navigate(`/${user.role}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dspz-navy via-slate-900 to-dspz-blue px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-slate-800">Change password</h1>
        {forced && (
          <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You must set a new password before continuing. The temporary password can no longer be used.
          </p>
        )}
        {info && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{info}</div>}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Current password</label>
            <input
              type="password"
              name="currentPassword"
              required
              value={form.currentPassword}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              value={form.newPassword}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-dspz-navy py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
}
