import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { setAccessToken } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const state = location.state || {};
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(state.message || '');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const purpose = state.purpose || 'register';
  const email = state.email || '';
  const userId = state.userId;

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = purpose === 'login' ? { userId, otp, purpose } : { email, otp, purpose };
      const res = await api.post('/api/auth/verify-otp', payload);
      if (purpose === 'login') {
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
        navigate(`/${res.data.data.user.role}`);
      } else {
        navigate('/login', {
          state: { message: 'Email verified successfully. You can now sign in.' },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await api.post('/api/auth/resend-otp', { email, purpose });
      setInfo('A new code has been sent to your email.');
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dspz-navy via-slate-900 to-dspz-blue px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-slate-800">Verify your identity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the 6-digit code sent to <span className="font-semibold">{email || 'your email'}</span>
        </p>
        {info && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{info}</div>}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:border-dspz-blue focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-dspz-navy py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        <div className="mt-4 text-center">
          {cooldown > 0 ? (
            <p className="text-sm text-slate-500">Resend available in {cooldown}s</p>
          ) : (
            <button onClick={handleResend} className="text-sm font-semibold text-dspz-blue hover:underline">
              Resend code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
