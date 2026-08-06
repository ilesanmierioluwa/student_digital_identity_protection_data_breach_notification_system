import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/academic', label: 'Schools & Departments' },
    { to: '/admin/students', label: 'Students & Officers' },
    { to: '/admin/audit', label: 'Audit Logs' },
    { to: '/admin/security', label: 'Security Dashboard' },
  ],
  officer: [
    { to: '/officer', label: 'Dashboard', end: true },
  ],
  student: [
    { to: '/student', label: 'Dashboard', end: true },
    { to: '/student/profile', label: 'My Identity' },
    { to: '/student/sessions', label: 'Sessions' },
    { to: '/student/audit', label: 'Who viewed my record' },
    { to: '/student/tickets', label: 'Report Suspicious Activity' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = navItems[user.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link to={`/${user.role}`} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-dspz-navy text-sm font-black text-dspz-accent">
            DSPZ
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight text-dspz-navy">Delta State Polytechnic</p>
            <p className="text-xs text-slate-500">Otefe-Oghara</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-dspz-navy text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
            <p className="text-xs capitalize text-slate-500">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
