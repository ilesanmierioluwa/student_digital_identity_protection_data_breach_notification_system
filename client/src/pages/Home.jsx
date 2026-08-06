import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Home() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    api
      .get('/api/health')
      .then((res) => setStatus(res.data.success ? 'online' : 'offline'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dspz-navy via-slate-900 to-dspz-blue text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-dspz-accent font-black text-dspz-navy">
              DSPZ
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Student Digital Identity Protection</p>
              <p className="text-xs text-slate-300">Data Breach Notification System</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/10">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-dspz-accent px-4 py-2 text-sm font-semibold text-dspz-navy hover:brightness-110"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-dspz-accent">
            Delta State Polytechnic, Otefe-Oghara
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Protecting student identity data before, during, and after a breach
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            An intelligent platform that encrypts student records at rest, watches for suspicious
            access, and automatically notifies affected students when a breach is detected.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="rounded-lg bg-dspz-accent px-6 py-3 font-semibold text-dspz-navy hover:brightness-110"
            >
              Register your digital identity
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-white/20 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Staff / Student sign in
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            ['Encryption at rest', 'Sensitive student fields are AES-256-GCM encrypted before they ever touch the database.'],
            ['Anomaly detection', 'A rule engine flags impossible travel, off-hours access, brute force, and bulk data exports in real time.'],
            ['Instant breach alerts', 'Affected students and admins are notified automatically by email and in-app the moment an incident is detected.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-slate-300">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-slate-400">
          API status: <span className={status === 'online' ? 'text-green-400' : 'text-red-400'}>{status}</span>
        </p>
      </main>
    </div>
  );
}
