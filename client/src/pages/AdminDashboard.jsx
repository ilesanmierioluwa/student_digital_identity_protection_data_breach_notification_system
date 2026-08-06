import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import api from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ schools: 0, departments: 0, students: 0, officers: 0, needsReview: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/api/academic/schools'),
      api.get('/api/academic/departments'),
      api.get('/api/admin/students', { params: { limit: 1 } }).catch(() => ({ data: { data: { total: 0 } } })),
      api.get('/api/admin/officers', { params: { limit: 1 } }).catch(() => ({ data: { data: { total: 0 } } })),
    ])
      .then(([schools, depts, students, officers]) => {
        setStats({
          schools: schools.data.data.length,
          departments: depts.data.data.length,
          students: students.data.data?.total || 0,
          officers: officers.data.data?.total || 0,
          needsReview: depts.data.data.filter((d) => d.needsReview).length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Administration Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage the academic structure and student identity records.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Schools" value={stats.schools} />
          <StatCard label="Departments" value={stats.departments} />
          <StatCard label="Students" value={stats.students} />
          <StatCard label="Officers" value={stats.officers} />
          <StatCard
            label="Needs review"
            value={stats.needsReview}
            accent={stats.needsReview > 0 ? 'text-amber-600' : 'text-dspz-navy'}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/academic"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-dspz-blue"
          >
            <h3 className="font-semibold text-slate-800">Schools & Departments</h3>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage the academic structure that powers student registration.
            </p>
          </Link>
          <Link
            to="/admin/security"
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-dspz-blue"
          >
            <h3 className="font-semibold text-slate-800">Security & Audit</h3>
            <p className="mt-1 text-sm text-slate-500">
              Risk heatmap, flagged anomalies, open breach incidents, and detection thresholds.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
