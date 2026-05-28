import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api';
import { Modal, StatusBadge } from '../components/Layout.jsx';

const empty = { code: '', name: '', client: '', location: '', start_date: '', end_date: '',
  status: 'planning', budget_total: 0, currency: 'USD', notes: '' };

export default function Projects() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState(null);

  const load = () => api.get('/projects').then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setErr(null);
    try {
      await api.post('/projects', form);
      setOpen(false); setForm(empty); load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects & BOQ</h1>
          <p className="text-sm text-slate-500">Each project owns a Bill of Quantities and a quotation set.</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(empty); setOpen(true); }}>+ New project</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Code</th><th className="th">Name</th><th className="th">Client</th>
              <th className="th">Status</th><th className="th text-right">Budget</th>
              <th className="th text-right">BOQ Items</th><th className="th text-right">Awarded</th>
              <th className="th text-right">Variance</th><th className="th">Vendors</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={10} className="td text-center text-slate-500 py-8">
                No projects yet. Create one to begin BOQ review.
              </td></tr>
            )}
            {items.map(p => {
              const v = (p.boq_awarded || 0) - (p.boq_budgeted || 0);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs">{p.code}</td>
                  <td className="td font-medium">
                    <Link to={`/projects/${p.id}`} className="text-indigo-600 hover:underline">{p.name}</Link>
                  </td>
                  <td className="td">{p.client || '—'}</td>
                  <td className="td"><StatusBadge status={p.status} /></td>
                  <td className="td text-right">{fmt.money(p.budget_total, p.currency)}</td>
                  <td className="td text-right">{p.boq_count}</td>
                  <td className="td text-right">{fmt.money(p.boq_awarded, p.currency)}</td>
                  <td className={`td text-right ${v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : ''}`}>
                    {fmt.money(v, p.currency)}
                  </td>
                  <td className="td">{p.vendor_count}</td>
                  <td className="td"><Link to={`/projects/${p.id}`} className="text-xs text-indigo-600">Open →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New project"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Create</button>
        </>}>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project code *"><input className="input" value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value })} placeholder="PRJ-001" /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {['planning','in_progress','on_hold','completed'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Project name *" className="col-span-2"><input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Client"><input className="input" value={form.client}
            onChange={e => setForm({ ...form, client: e.target.value })} /></Field>
          <Field label="Location"><input className="input" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Start date"><input type="date" className="input" value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })} /></Field>
          <Field label="End date"><input type="date" className="input" value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })} /></Field>
          <Field label="Budget total"><input type="number" className="input" value={form.budget_total}
            onChange={e => setForm({ ...form, budget_total: e.target.value })} /></Field>
          <Field label="Currency"><input className="input" value={form.currency}
            onChange={e => setForm({ ...form, currency: e.target.value })} /></Field>
          <Field label="Notes" className="col-span-2"><textarea className="input" rows={2} value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}
