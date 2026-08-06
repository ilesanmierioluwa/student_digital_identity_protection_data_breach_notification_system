import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function SessionsManager() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const load = useCallback(() => {
    api
      .get('/api/auth/sessions')
      .then((res) => setSessions(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load sessions'));
  }, []);

  useEffect(load, [load]);

  const revoke = async (id) => {
    try {
      const res = await api.post(`/api/auth/sessions/${id}/revoke`);
      setMessage(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not revoke session');
    }
  };

  const revokeAll = async () => {
    try {
      const res = await api.post('/api/auth/sessions/revoke-all');
      setMessage(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not revoke sessions');
    }
  };

  const enable2fa = async () => {
    setError('');
    try {
      const res = await api.post('/api/auth/2fa/enable');
      setMessage(res.data.message);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not enable 2FA');
    }
  };

  const confirm2fa = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/auth/2fa/confirm', { otp: otpInput });
      setMessage(res.data.message);
      setOtpSent(false);
      setOtpInput('');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not confirm code');
    }
  };

  const disable2fa = async () => {
    const password = window.prompt('Enter your password to disable two-factor authentication:');
    if (!password) return;
    try {
      const res = await api.post('/api/auth/2fa/disable', { password });
      setMessage(res.data.message);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disable 2FA');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Active Sessions & Security</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review the devices signed into your account and revoke any you do not recognise.
        </p>

        {message && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Active sessions</h2>
              <button
                onClick={revokeAll}
                className="rounded bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
              >
                Sign out everywhere
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {sessions.map((s) => (
                <li key={s._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{s.deviceInfo || 'Unknown device'}</p>
                      {s.isCurrent && (
                        <span className="rounded-full bg-dspz-navy px-2 py-0.5 text-[10px] font-bold text-white">THIS DEVICE</span>
                      )}
                      {s.isRevoked && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">REVOKED</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      IP {s.ipAddress || '—'} &bull; last active {s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : '—'}
                    </p>
                  </div>
                  {!s.isRevoked && (
                    <button
                      onClick={() => revoke(s._id)}
                      className="rounded bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Revoke
                    </button>
                  )}
                </li>
              ))}
              {sessions.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No active sessions.</p>}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Two-factor authentication</h2>
            <p className="mt-1 text-sm text-slate-500">
              Email OTP 2FA: every login will require a one-time code sent to your email.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm">
              Status:{' '}
              <span className={user?.twoFactorEnabled ? 'font-semibold text-green-600' : 'font-semibold text-slate-600'}>
                {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {!otpSent ? (
              <button
                onClick={user?.twoFactorEnabled ? disable2fa : enable2fa}
                className={`mt-4 w-full rounded-lg py-2.5 font-semibold text-white hover:opacity-90 ${
                  user?.twoFactorEnabled ? 'bg-red-500' : 'bg-dspz-navy'
                }`}
              >
                {user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            ) : (
              <form onSubmit={confirm2fa} className="mt-4 space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter the 6-digit code"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-xl font-bold tracking-widest focus:border-dspz-blue focus:outline-none"
                />
                <button className="w-full rounded-lg bg-dspz-navy py-2.5 font-semibold text-white hover:opacity-90">
                  Confirm & enable
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
