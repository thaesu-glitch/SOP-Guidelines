import { useEffect, useState } from 'react';
import { api, fmt } from '../api';
import { Modal, StatusBadge } from '../components/Layout.jsx';

const empty = { vendor_code: '', name: '', category: '', contact_person: '', email: '', phone: '',
  address: '', registration_no: '', tax_id: '', status: 'pending', approved_date: '', approved_by: '', notes: '' };

export default function Vendors() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState(null);

  const load = () => api.get('/vendors').then(setItems);
  useEffect(() => { load(); }, []);

  const save = async () => {
    setErr(null);
    try {
      if (form.id) await api.put(`/vendors/${form.id}`, form);
      else await api.post('/vendors', form);
      setOpen(false); setForm(empty); load();
    } catch (e) { setErr(e.message); }
  };
  const approve = async (v) => {
    const by = prompt(`Approving ${v.name}. Approved by:`);
    if (by === null) return;
    await api.post(`/vendors/${v.id}/approve`, { approved_by: by });
    load();
  };
  const remove = async (v) => {
    if (!confirm(`Delete ${v.name}? This removes their quotations and project links.`)) return;
    await api.del(`/vendors/${v.id}`); load();
  };

  const filtered = items.filter(v => filter === 'all' ? true : v.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Vendors</h1>
          <p className="text-sm text-slate-500">Vendor master with approval status and contract footprint.</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-auto" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          <button className="btn-primary" onClick={() => { setForm(empty); setOpen(true); }}>+ New vendor</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Code</th><th className="th">Name</th><th className="th">Category</th>
              <th className="th">Contact</th><th className="th">Status</th>
              <th className="th">Approved</th><th className="th text-right">Projects</th>
              <th className="th text-right">Total Contract</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="td text-center text-slate-500 py-8">No vendors match this filter.</td></tr>
            )}
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="td font-mono text-xs">{v.vendor_code}</td>
                <td className="td font-medium">{v.name}</td>
                <td className="td">{v.category || '—'}</td>
                <td className="td text-xs">
                  {v.contact_person && <div>{v.contact_person}</div>}
                  {v.email && <div className="text-slate-500">{v.email}</div>}
                </td>
                <td className="td"><StatusBadge status={v.status} /></td>
                <td className="td text-xs">
                  {v.approved_date ? <>{fmt.date(v.approved_date)}<div className="text-slate-500">by {v.approved_by || '—'}</div></> : '—'}
                </td>
                <td className="td text-right">{v.project_count}</td>
                <td className="td text-right">{fmt.money(v.total_contract_value)}</td>
                <td className="td">
                  <button className="text-xs text-indigo-600 mr-2"
                    onClick={() => { setForm({ ...empty, ...v }); setOpen(true); }}>Edit</button>
                  {v.status !== 'approved' &&
                    <button className="text-xs text-emerald-700 mr-2" onClick={() => approve(v)}>Approve</button>}
                  <button className="text-xs text-rose-600" onClick={() => remove(v)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Edit vendor' : 'New vendor'}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>}>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor code *"><input className="input" value={form.vendor_code}
            onChange={e => setForm({ ...form, vendor_code: e.target.value })} placeholder="V-001" /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {['pending','approved','blacklisted'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Vendor name *" className="col-span-2"><input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category"><input className="input" value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Civil / MEP / Equipment" /></Field>
          <Field label="Contact person"><input className="input" value={form.contact_person}
            onChange={e => setForm({ ...form, contact_person: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><input className="input" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Registration no."><input className="input" value={form.registration_no}
            onChange={e => setForm({ ...form, registration_no: e.target.value })} /></Field>
          <Field label="Tax ID"><input className="input" value={form.tax_id}
            onChange={e => setForm({ ...form, tax_id: e.target.value })} /></Field>
          <Field label="Address" className="col-span-2"><textarea className="input" rows={2} value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Approved date"><input type="date" className="input" value={form.approved_date || ''}
            onChange={e => setForm({ ...form, approved_date: e.target.value })} /></Field>
          <Field label="Approved by"><input className="input" value={form.approved_by || ''}
            onChange={e => setForm({ ...form, approved_by: e.target.value })} /></Field>
          <Field label="Notes" className="col-span-2"><textarea className="input" rows={2} value={form.notes || ''}
            onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}
