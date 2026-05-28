import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects & BOQ' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/approvals', label: 'Approved Vendor Matrix' }
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">BOQ & Vendor Management</div>
            <div className="text-xs text-slate-400">Budget review · Quotation comparison · Approved vendor dashboard</div>
          </div>
          <nav className="flex gap-1">
            {navItems.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-400 py-4">
        Asia Strategic · Finance & Internal Control SOP Tooling
      </footer>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    approved: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    blacklisted: 'bg-rose-100 text-rose-800',
    awarded: 'bg-emerald-100 text-emerald-800',
    selected: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
    received: 'bg-slate-100 text-slate-700',
    planning: 'bg-sky-100 text-sky-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-slate-200 text-slate-700',
    on_hold: 'bg-amber-100 text-amber-800'
  };
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status || '—'}</span>;
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {footer && <div className="px-5 py-3 border-t bg-slate-50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, accent = 'indigo' }) {
  const colors = {
    indigo: 'border-l-indigo-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    rose: 'border-l-rose-500',
    sky: 'border-l-sky-500'
  };
  return (
    <div className={`card border-l-4 ${colors[accent]}`}>
      <div className="text-xs uppercase text-slate-500 font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
