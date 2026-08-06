import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-7xl font-black text-dspz-blue">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="mt-6 rounded-lg bg-dspz-navy px-6 py-3 font-semibold text-white hover:opacity-90">
        Back to home
      </Link>
    </div>
  );
}
