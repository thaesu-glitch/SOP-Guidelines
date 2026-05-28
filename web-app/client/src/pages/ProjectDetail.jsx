import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmt } from '../api';
import { Modal, StatusBadge } from '../components/Layout.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [tab, setTab] = useState('boq');
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);

  const reload = async () => {
    try {
      const [p, b, v] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/boq?project_id=${id}`),
        api.get('/vendors')
      ]);
      setProject(p); setItems(b); setVendors(v);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { reload(); }, [id]);

  if (err) return <div className="text-rose-600">{err}</div>;
  if (!project) return <div className="text-slate-500">Loading…</div>;

  const totalBudget = items.reduce((s, i) => s + (i.budgeted_total || 0), 0);
  const totalAwarded = items.reduce((s, i) => s + (i.awarded_total || 0), 0);
  const variance = totalAwarded - totalBudget;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/projects" className="text-sm text-indigo-600">← All projects</Link>
          <h1 className="text-xl font-semibold mt-1">{project.name}</h1>
          <div className="text-sm text-slate-500">
            {project.code} · {project.client || 'no client'} · <StatusBadge status={project.status} />
          </div>
        </div>
        <div className="text-right text-sm">
          <div>Budget: <span className="font-semibold">{fmt.money(project.budget_total, project.currency)}</span></div>
          <div>BOQ budgeted: {fmt.money(totalBudget, project.currency)}</div>
          <div>BOQ awarded: <span className="font-semibold">{fmt.money(totalAwarded, project.currency)}</span></div>
          <div className={variance > 0 ? 'text-rose-600' : variance < 0 ? 'text-emerald-600' : ''}>
            Variance: {fmt.money(variance, project.currency)}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {[['boq','BOQ Budget Review'], ['quotes','Quotation Comparison']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === k ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'boq'
        ? <BoqTab projectId={id} items={items} reload={reload} setSelected={setSelected}
                  currency={project.currency} />
        : <QuotesTab items={items} vendors={vendors} projectId={id} reload={reload}
                     currency={project.currency} selected={selected} setSelected={setSelected} />}
    </div>
  );
}

function BoqTab({ projectId, items, reload, setSelected, currency }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ section: '', item_code: '', description: '', unit: '',
    quantity: 0, budgeted_unit_rate: 0, remarks: '' });
  const save = async () => {
    await api.post('/boq', { project_id: Number(projectId), ...form });
    setOpen(false); setForm({ section: '', item_code: '', description: '', unit: '',
      quantity: 0, budgeted_unit_rate: 0, remarks: '' });
    reload();
  };
  const remove = async (id) => {
    if (!confirm('Delete this BOQ item and all its quotations?')) return;
    await api.del(`/boq/${id}`); reload();
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="text-sm text-slate-600">{items.length} line items</div>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add BOQ line</button>
      </div>
      <table className="min-w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="th">Section</th><th className="th">Code</th><th className="th">Description</th>
            <th className="th">Unit</th><th className="th text-right">Qty</th>
            <th className="th text-right">Budget Rate</th><th className="th text-right">Budget Total</th>
            <th className="th text-right">Awarded Total</th><th className="th text-right">Variance</th>
            <th className="th">Awarded Vendor</th><th className="th text-right">Quotes</th>
            <th className="th">Status</th><th className="th"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={13} className="td text-center text-slate-500 py-8">
              No BOQ items yet. Add a line to start budget review.
            </td></tr>
          )}
          {items.map(i => {
            const v = (i.awarded_total || 0) - (i.budgeted_total || 0);
            return (
              <tr key={i.id} className="hover:bg-slate-50">
                <td className="td">{i.section || '—'}</td>
                <td className="td font-mono text-xs">{i.item_code || '—'}</td>
                <td className="td max-w-xs truncate" title={i.description}>{i.description}</td>
                <td className="td">{i.unit || '—'}</td>
                <td className="td text-right">{fmt.number(i.quantity)}</td>
                <td className="td text-right">{fmt.money(i.budgeted_unit_rate, currency)}</td>
                <td className="td text-right">{fmt.money(i.budgeted_total, currency)}</td>
                <td className="td text-right">{i.awarded_total ? fmt.money(i.awarded_total, currency) : '—'}</td>
                <td className={`td text-right ${v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : ''}`}>
                  {i.awarded_total ? fmt.money(v, currency) : '—'}
                </td>
                <td className="td">{i.awarded_vendor_name || '—'}</td>
                <td className="td text-right">{i.quote_count}</td>
                <td className="td"><StatusBadge status={i.status} /></td>
                <td className="td">
                  <button className="text-xs text-indigo-600 mr-2"
                    onClick={() => setSelected(i)}>Compare</button>
                  <button className="text-xs text-rose-600" onClick={() => remove(i.id)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal open={open} onClose={() => setOpen(false)} title="Add BOQ line item"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Add</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section"><input className="input" value={form.section}
            onChange={e => setForm({ ...form, section: e.target.value })} placeholder="Civil / MEP / Finishes" /></Field>
          <Field label="Item code"><input className="input" value={form.item_code}
            onChange={e => setForm({ ...form, item_code: e.target.value })} /></Field>
          <Field label="Description *" className="col-span-2">
            <textarea className="input" rows={2} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Unit"><input className="input" value={form.unit}
            onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="m², m³, no., lot" /></Field>
          <Field label="Quantity"><input type="number" className="input" value={form.quantity}
            onChange={e => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Budgeted unit rate"><input type="number" className="input" value={form.budgeted_unit_rate}
            onChange={e => setForm({ ...form, budgeted_unit_rate: e.target.value })} /></Field>
          <Field label="Budgeted total" >
            <input className="input bg-slate-50" disabled
              value={fmt.money((form.quantity || 0) * (form.budgeted_unit_rate || 0), currency)} />
          </Field>
          <Field label="Remarks" className="col-span-2"><textarea className="input" rows={2} value={form.remarks}
            onChange={e => setForm({ ...form, remarks: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function QuotesTab({ items, vendors, projectId, reload, currency, selected, setSelected }) {
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState({ vendor_id: '', quoted_unit_rate: 0, quote_date: '', validity_date: '',
    payment_terms: '', delivery_lead_time: '', remarks: '' });

  useEffect(() => {
    if (!selected) { setQuotes([]); return; }
    api.get(`/quotations?boq_item_id=${selected.id}`).then(setQuotes);
  }, [selected]);

  const refreshAll = async () => {
    await reload();
    if (selected) setQuotes(await api.get(`/quotations?boq_item_id=${selected.id}`));
  };

  const saveQuote = async () => {
    if (!form.vendor_id) return alert('Select a vendor');
    await api.post('/quotations', {
      project_id: Number(projectId), boq_item_id: selected.id, vendor_id: Number(form.vendor_id),
      quoted_unit_rate: form.quoted_unit_rate, quote_date: form.quote_date,
      validity_date: form.validity_date, payment_terms: form.payment_terms,
      delivery_lead_time: form.delivery_lead_time, remarks: form.remarks
    });
    setOpen(false);
    setForm({ vendor_id: '', quoted_unit_rate: 0, quote_date: '', validity_date: '',
      payment_terms: '', delivery_lead_time: '', remarks: '' });
    refreshAll();
  };

  const award = async (quotationId) => {
    if (!confirm('Award this BOQ item to the selected vendor? This will reject other quotes.')) return;
    await api.post(`/boq/${selected.id}/award`, { quotation_id: quotationId });
    refreshAll();
  };
  const removeQuote = async (qid) => {
    if (!confirm('Delete this quotation?')) return;
    await api.del(`/quotations/${qid}`); refreshAll();
  };

  if (items.length === 0) {
    return <div className="card text-center text-slate-500 py-8">Add BOQ items first to capture quotations.</div>;
  }

  const lowest = quotes.length ? Math.min(...quotes.map(q => q.quoted_total)) : null;

  return (
    <div className="grid lg:grid-cols-[280px,1fr] gap-4">
      <div className="card p-0 overflow-hidden">
        <div className="px-3 py-2 border-b bg-slate-50 text-xs font-semibold uppercase text-slate-600">
          BOQ Items
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {items.map(i => (
            <button key={i.id} onClick={() => setSelected(i)}
              className={`w-full text-left px-3 py-2 border-b text-sm ${
                selected?.id === i.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}>
              <div className="font-medium truncate">{i.description}</div>
              <div className="text-xs text-slate-500 flex justify-between mt-0.5">
                <span>{i.item_code || i.section || 'BOQ'} · {i.quote_count} quotes</span>
                <StatusBadge status={i.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {!selected
          ? <div className="card text-center text-slate-500 py-10">Select a BOQ item to compare quotations.</div>
          : <>
              <div className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-500">{selected.section} · {selected.item_code}</div>
                    <div className="font-semibold">{selected.description}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {fmt.number(selected.quantity)} {selected.unit || ''} · Budgeted rate {fmt.money(selected.budgeted_unit_rate, currency)} · Budget {fmt.money(selected.budgeted_total, currency)}
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => setOpen(true)}>+ Add quotation</button>
                </div>
              </div>

              <div className="card p-0 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">Vendor</th><th className="th">Vendor Status</th>
                      <th className="th text-right">Unit Rate</th><th className="th text-right">Total</th>
                      <th className="th text-right">vs Budget</th><th className="th text-right">vs Lowest</th>
                      <th className="th">Payment</th><th className="th">Lead</th>
                      <th className="th">Status</th><th className="th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.length === 0 && (
                      <tr><td colSpan={10} className="td text-center text-slate-500 py-8">
                        No quotations captured for this BOQ line yet.
                      </td></tr>
                    )}
                    {quotes.map(q => {
                      const vsBudget = q.quoted_total - selected.budgeted_total;
                      const vsLowest = q.quoted_total - lowest;
                      return (
                        <tr key={q.id} className={q.status === 'selected' ? 'bg-emerald-50' : 'hover:bg-slate-50'}>
                          <td className="td font-medium">{q.vendor_name}
                            <div className="text-xs text-slate-500 font-mono">{q.vendor_code}</div></td>
                          <td className="td"><StatusBadge status={q.vendor_status} /></td>
                          <td className="td text-right">{fmt.money(q.quoted_unit_rate, currency)}</td>
                          <td className="td text-right font-semibold">{fmt.money(q.quoted_total, currency)}</td>
                          <td className={`td text-right ${vsBudget > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {fmt.money(vsBudget, currency)}
                          </td>
                          <td className="td text-right">
                            {q.quoted_total === lowest
                              ? <span className="badge bg-emerald-100 text-emerald-800">Lowest</span>
                              : `+${fmt.money(vsLowest, currency)}`}
                          </td>
                          <td className="td text-xs">{q.payment_terms || '—'}</td>
                          <td className="td text-xs">{q.delivery_lead_time || '—'}</td>
                          <td className="td"><StatusBadge status={q.status} /></td>
                          <td className="td">
                            {q.status !== 'selected' && q.vendor_status === 'approved' &&
                              <button className="text-xs text-emerald-700 mr-2" onClick={() => award(q.id)}>Award</button>}
                            {q.vendor_status !== 'approved' && q.status !== 'selected' &&
                              <span className="text-xs text-amber-600 mr-2" title="Vendor not approved">Approve vendor first</span>}
                            <button className="text-xs text-rose-600" onClick={() => removeQuote(q.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Add quotation for: ${selected?.description || ''}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveQuote}>Save quotation</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vendor *" className="col-span-2">
            <select className="input" value={form.vendor_id}
              onChange={e => setForm({ ...form, vendor_id: e.target.value })}>
              <option value="">— Select vendor —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>
                {v.name} ({v.vendor_code}) {v.status !== 'approved' ? `· ${v.status}` : ''}
              </option>)}
            </select>
          </Field>
          <Field label="Quoted unit rate"><input type="number" className="input" value={form.quoted_unit_rate}
            onChange={e => setForm({ ...form, quoted_unit_rate: e.target.value })} /></Field>
          <Field label="Quoted total (auto)">
            <input className="input bg-slate-50" disabled
              value={fmt.money((selected?.quantity || 0) * (form.quoted_unit_rate || 0), currency)} />
          </Field>
          <Field label="Quote date"><input type="date" className="input" value={form.quote_date}
            onChange={e => setForm({ ...form, quote_date: e.target.value })} /></Field>
          <Field label="Validity"><input type="date" className="input" value={form.validity_date}
            onChange={e => setForm({ ...form, validity_date: e.target.value })} /></Field>
          <Field label="Payment terms"><input className="input" value={form.payment_terms}
            onChange={e => setForm({ ...form, payment_terms: e.target.value })} placeholder="30% advance, 70% on delivery" /></Field>
          <Field label="Delivery lead time"><input className="input" value={form.delivery_lead_time}
            onChange={e => setForm({ ...form, delivery_lead_time: e.target.value })} placeholder="4 weeks" /></Field>
          <Field label="Remarks" className="col-span-2"><textarea className="input" rows={2} value={form.remarks}
            onChange={e => setForm({ ...form, remarks: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}
