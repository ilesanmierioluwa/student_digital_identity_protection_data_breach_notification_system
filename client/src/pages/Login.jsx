import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const notice = location.state?.message;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      if (res.data?.requiresOtp) {
        navigate('/verify-otp', {
          state: { email: form.email, purpose: res.data.purpose, userId: res.data.userId },
        });
        return;
      }
      if (res.data?.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      navigate(`/${res.data.user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dspz-navy via-slate-900 to-dspz-blue px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-dspz-navy font-black text-dspz-accent">
            DSPZ
          </div>
          <h1 className="mt-3 text-xl font-bold text-slate-800">Sign in</h1>
          <p className="text-sm text-slate-500">Delta State Polytechnic, Otefe-Oghara</p>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none focus:ring-1 focus:ring-dspz-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none focus:ring-1 focus:ring-dspz-blue"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-dspz-navy py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          New student?{' '}
          <Link to="/register" className="font-semibold text-dspz-blue hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
