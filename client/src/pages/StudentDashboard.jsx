import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {user.fullName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your digital identity dashboard. Your data is encrypted at rest and every access is audited.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ['Matric number', user.matricNumber || '—'],
            ['Level', user.level || '—'],
            ['Email verified', user.isEmailVerified ? 'Yes' : 'No'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Profile completion</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add your passport photo and ID document to complete your verified digital identity.
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 rounded-full bg-dspz-accent" />
          </div>
          <p className="mt-2 text-xs text-slate-400">Profile setup arrives in the next phase.</p>
        </div>
      </main>
    </div>
  );
}
