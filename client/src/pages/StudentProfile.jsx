import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '', nin: '', level: 'ND1', reason: '' });
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.get('/api/students/profile'), api.get('/api/students/profile/changes')])
      .then(([p, c]) => {
        const prof = p.data.data;
        const pendingReqs = c.data.data.filter((r) => r.status === 'pending');
        const latest = pendingReqs[0]?.requestedChanges || {};
        setProfile(prof);
        setForm({
          fullName: latest.fullName ?? prof.user.fullName,
          phone: (latest.phone ?? prof.phone) || '',
          nin: (latest.nin ?? prof.nin) || '',
          level: (latest.level ?? prof.user.level) || 'ND1',
          reason: '',
        });
        setPending(c.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load profile'));
  }, []);

  useEffect(load, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.put('/api/students/profile', {
        fullName: form.fullName,
        phone: form.phone,
        nin: form.nin || undefined,
        level: form.level,
        reason: form.reason,
      });
      setMessage(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (field) => {
    setError('');
    setMessage('');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,application/pdf';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large — maximum 5MB');
        return;
      }
      const fd = new FormData();
      fd.append(field, file);
      try {
        const res = await api.post('/api/students/documents', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage(res.data.message);
        load();
      } catch (err) {
        setError(err.response?.data?.message || 'Upload failed');
      }
    };
    input.click();
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center py-20 text-slate-400">Loading profile...</div>
      </div>
    );
  }

  const statusBadge = profile.profileVerified
    ? 'bg-green-100 text-green-700'
    : profile.profileNeedsVerification
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-600';

  const statusLabel = profile.profileVerified
    ? 'Verified'
    : profile.profileNeedsVerification
      ? 'Needs verification'
      : 'Pending verification';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Digital Identity</h1>
            <p className="mt-1 text-sm text-slate-500">
              Changes to identity fields (name, matric, level, department, phone, NIN) require officer re-verification.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>{statusLabel}</span>
        </div>

        {message && <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800">Bio-data</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">NIN (optional)</label>
                  <input
                    type="text"
                    value={form.nin}
                    onChange={(e) => setForm({ ...form, nin: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Level</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
                >
                  {['ND1', 'ND2', 'HND1', 'HND2'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Reason for change (required for identity fields)
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-dspz-blue focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-dspz-navy py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Request profile update'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Documents</h2>
              <p className="mt-1 text-sm text-slate-500">JPG, PNG or PDF — max 5MB each.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleUpload('photo')}
                  className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center hover:border-dspz-blue"
                >
                  {profile.user.photoUrl ? (
                    <img src={profile.user.photoUrl} alt="Passport" className="mx-auto h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <p className="text-sm text-slate-500">Upload passport photo</p>
                  )}
                </button>
                <button
                  onClick={() => handleUpload('idDocument')}
                  className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center hover:border-dspz-blue"
                >
                  {profile.user.idDocumentUrl ? (
                    <img src={profile.user.idDocumentUrl} alt="ID doc" className="mx-auto h-20 w-20 rounded object-cover" />
                  ) : (
                    <p className="text-sm text-slate-500">Upload ID document</p>
                  )}
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Matric: {profile.user.matricNumber} &bull; Department: {profile.department?.name}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-800">Pending verification requests</h2>
              {pending.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No pending requests.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {pending.map((r) => (
                    <li key={r._id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span className="font-medium capitalize">{r.status}</span> —{' '}
                      {Object.keys(r.requestedChanges).join(', ')}
                      <span className="ml-2 text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
