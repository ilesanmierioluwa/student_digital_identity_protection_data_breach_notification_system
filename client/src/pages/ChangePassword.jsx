import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <path d="M1 1l22 22" />
  </svg>
);

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                name="currentPassword"
                required
                value={form.currentPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 focus:border-dspz-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-dspz-navy"
              >
                {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                name="newPassword"
                required
                minLength={8}
                value={form.newPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 focus:border-dspz-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-dspz-navy"
              >
                {showNew ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 focus:border-dspz-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-dspz-navy"
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
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
