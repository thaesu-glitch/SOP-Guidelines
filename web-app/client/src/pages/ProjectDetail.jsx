import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmt } from '../api';
import { Modal, StatusBadge } from '../components/Layout.jsx';
import { Field, Section, Text, Num, TextArea, Select } from '../components/Form.jsx';

const emptyBoq = {
  item_code: '', tender_code: '',
  lv1_code: '', lv1_name: '', lv2_code: '', lv2_name: '',
  lv3_code: '', lv3_name: '', lv4_code: '', lv4_name: '',
  lv5_code: '', lv5_name: '',
  room: '', floor: '', width: null, depth: null, height: null, thickness: null,
  other_type: '', other_value: '',
  color: '', color_code: '', material: '', material_code: '',
  description: '', unit: '', availability: 'Included', material_labour: 'M+L',
  quantity: 0, historical_price: null, historical_fx_rate: null,
  adjustment: 0, budgeted_unit_rate: 0,
  remarks: ''
};

const emptyQuote = {
  vendor_id: '',
  primary_unit_price: 0, primary_quantity: 0,
  additional_unit_price: 0, additional_quantity: 0,
  material_price: 0, labor_cost: 0,
  ov_room: '', ov_floor: '', ov_width: null, ov_depth: null,
  ov_height: null, ov_thickness: null, ov_color: '', ov_material: '',
  vendor_note: '',
  quote_date: '', validity_date: '', payment_terms: '', delivery_lead_time: '',
  remarks: ''
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [rollup, setRollup] = useState([]);
  const [tab, setTab] = useState('boq');
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState(null);

  const reload = async () => {
    try {
      const [p, b, v, r] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/boq?project_id=${id}`),
        api.get('/vendors'),
        api.get(`/projects/${id}/rollup`)
      ]);
      setProject(p); setItems(b); setVendors(v); setRollup(r);
      if (selected) {
        const updated = b.find(x => x.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (err) return <div className="text-rose-600">{err}</div>;
  if (!project) return <div className="text-slate-500">Loading…</div>;

  const totalBudget = items.reduce((s, i) => s + (i.budgeted_total || 0), 0);
  const totalAwarded = items.reduce((s, i) => s + (i.awarded_total || 0), 0);
  const variance = totalAwarded - totalBudget;
  const cur = project.currency;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/projects" className="text-sm text-indigo-600">← All projects</Link>
          <h1 className="text-xl font-semibold mt-1">{project.name}</h1>
          <div className="text-sm text-slate-500">
            {project.code} · {project.client || 'no client'} · <StatusBadge status={project.status} /> · {cur}
          </div>
        </div>
        <div className="text-right text-sm">
          <div>Approved budget: <span className="font-semibold">{fmt.money(project.budget_total, cur)}</span></div>
          <div>BOQ estimate: {fmt.money(totalBudget, cur)}</div>
          <div>Awarded total: <span className="font-semibold">{fmt.money(totalAwarded, cur)}</span></div>
          <div className={variance > 0 ? 'text-rose-600' : variance < 0 ? 'text-emerald-600' : ''}>
            Variance: {fmt.money(variance, cur)}
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
        ? <BoqTab projectId={id} items={items} rollup={rollup} reload={reload}
                  setSelected={(s) => { setSelected(s); setTab('quotes'); }} currency={cur} />
        : <QuotesTab items={items} vendors={vendors} projectId={id} reload={reload}
                     currency={cur} selected={selected} setSelected={setSelected} />}
    </div>
  );
}

function RollupPanel({ rollup, currency }) {
  if (!rollup || rollup.length === 0) return null;
  // group by lv2
  const byLv2 = rollup.reduce((acc, r) => {
    (acc[r.lv2] = acc[r.lv2] || []).push(r); return acc;
  }, {});
  const lv2Totals = Object.fromEntries(Object.entries(byLv2).map(([lv2, rows]) => [lv2, {
    items: rows.reduce((s, r) => s + r.items, 0),
    budgeted: rows.reduce((s, r) => s + r.budgeted, 0),
    awarded: rows.reduce((s, r) => s + r.awarded, 0),
    awarded_count: rows.reduce((s, r) => s + r.awarded_count, 0)
  }]));
  const grand = {
    budgeted: rollup.reduce((s, r) => s + r.budgeted, 0),
    awarded: rollup.reduce((s, r) => s + r.awarded, 0)
  };
  const grandVar = grand.awarded - grand.budgeted;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-2 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Category roll-up (Lv2 / Lv3)</h3>
        <span className="text-xs text-slate-500">
          Budget {fmt.money(grand.budgeted, currency)} · Awarded {fmt.money(grand.awarded, currency)} ·
          <span className={grandVar > 0 ? 'text-rose-600 ml-1' : grandVar < 0 ? 'text-emerald-600 ml-1' : 'ml-1'}>
            Variance {fmt.money(grandVar, currency)}
          </span>
        </span>
      </div>
      <table className="min-w-full">
        <thead className="bg-slate-50/50">
          <tr>
            <th className="th">Lv2</th><th className="th">Lv3</th>
            <th className="th text-right">Items</th><th className="th text-right">Awarded / Total</th>
            <th className="th text-right">Budgeted</th><th className="th text-right">Awarded</th>
            <th className="th text-right">Variance</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byLv2).map(([lv2, rows]) => {
            const t = lv2Totals[lv2];
            const v = t.awarded - t.budgeted;
            return (
              <>
                <tr key={lv2} className="bg-indigo-50/40 font-medium">
                  <td className="td">{lv2}</td><td className="td text-slate-500">(subtotal)</td>
                  <td className="td text-right">{t.items}</td>
                  <td className="td text-right text-xs">{t.awarded_count} / {t.items}</td>
                  <td className="td text-right">{fmt.money(t.budgeted, currency)}</td>
                  <td className="td text-right">{fmt.money(t.awarded, currency)}</td>
                  <td className={`td text-right ${v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : ''}`}>
                    {fmt.money(v, currency)}
                  </td>
                </tr>
                {rows.map((r, i) => {
                  const rv = r.awarded - r.budgeted;
                  return (
                    <tr key={`${lv2}-${i}`} className="text-sm">
                      <td className="td"></td><td className="td">{r.lv3}</td>
                      <td className="td text-right">{r.items}</td>
                      <td className="td text-right text-xs">{r.awarded_count} / {r.items}</td>
                      <td className="td text-right">{fmt.money(r.budgeted, currency)}</td>
                      <td className="td text-right">{fmt.money(r.awarded, currency)}</td>
                      <td className={`td text-right ${rv > 0 ? 'text-rose-600' : rv < 0 ? 'text-emerald-600' : ''}`}>
                        {fmt.money(rv, currency)}
                      </td>
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BoqTab({ projectId, items, rollup, reload, setSelected, currency }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyBoq);

  const previewTotal = useMemo(() =>
    (Number(form.quantity) || 0) * (Number(form.budgeted_unit_rate) || 0) + (Number(form.adjustment) || 0),
  [form.quantity, form.budgeted_unit_rate, form.adjustment]);

  const save = async () => {
    if (!form.description) return alert('Description is required');
    await api.post('/boq', { project_id: Number(projectId), ...form });
    setOpen(false); setForm(emptyBoq); reload();
  };
  const remove = async (id) => {
    if (!confirm('Delete this BOQ item and all its quotations?')) return;
    await api.del(`/boq/${id}`); reload();
  };

  return (
    <div className="space-y-4">
      <RollupPanel rollup={rollup} currency={currency} />
      <div className="card p-0 overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="text-sm text-slate-600">{items.length} line items</div>
        <button className="btn-primary" onClick={() => setOpen(true)}>+ Add BOQ line</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Code</th><th className="th">Lv2 / Lv3</th><th className="th">Description</th>
              <th className="th">Room/Floor</th><th className="th">Unit</th>
              <th className="th text-right">Qty</th><th className="th text-right">Budget Rate</th>
              <th className="th text-right">Adj.</th><th className="th text-right">Budget Total</th>
              <th className="th text-right">Awarded</th><th className="th text-right">Variance</th>
              <th className="th">Awarded Vendor</th><th className="th text-right">Quotes</th>
              <th className="th">Status</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={15} className="td text-center text-slate-500 py-8">
                No BOQ items yet. Add a line to start budget review.
              </td></tr>
            )}
            {items.map(i => {
              const v = (i.awarded_total || 0) - (i.budgeted_total || 0);
              return (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="td font-mono text-xs">{i.item_code || '—'}</td>
                  <td className="td text-xs">
                    {i.lv2_name && <div>{i.lv2_name}</div>}
                    {i.lv3_name && <div className="text-slate-500">{i.lv3_name}</div>}
                  </td>
                  <td className="td max-w-xs">
                    <div className="truncate" title={i.description}>{i.description}</div>
                    {i.material && <div className="text-xs text-slate-500">{i.material}{i.color ? ` · ${i.color}` : ''}</div>}
                  </td>
                  <td className="td text-xs">
                    {i.room || '—'}{i.floor ? ` / ${i.floor}` : ''}
                  </td>
                  <td className="td">{i.unit || '—'}</td>
                  <td className="td text-right">{fmt.number(i.quantity)}</td>
                  <td className="td text-right">{fmt.money(i.budgeted_unit_rate, currency)}</td>
                  <td className="td text-right">{i.adjustment ? fmt.money(i.adjustment, currency) : '—'}</td>
                  <td className="td text-right">{fmt.money(i.budgeted_total, currency)}</td>
                  <td className="td text-right">{i.awarded_total ? fmt.money(i.awarded_total, currency) : '—'}</td>
                  <td className={`td text-right ${v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : ''}`}>
                    {i.awarded_total ? fmt.money(v, currency) : '—'}
                  </td>
                  <td className="td">{i.awarded_vendor_name || '—'}</td>
                  <td className="td text-right">{i.quote_count}</td>
                  <td className="td"><StatusBadge status={i.status} /></td>
                  <td className="td whitespace-nowrap">
                    <button className="text-xs text-indigo-600 mr-2" onClick={() => setSelected(i)}>Compare</button>
                    <button className="text-xs text-rose-600" onClick={() => remove(i.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add BOQ line item"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={save}>Add</button>
        </>}>
        <div className="space-y-3">
          <Section title="Classification (Lv1–Lv5)">
            <Field label="Combined code"><Text value={form.item_code}
              onChange={v => setForm({ ...form, item_code: v })} placeholder="1010101-000" /></Field>
            <Field label="Tender code"><Text value={form.tender_code}
              onChange={v => setForm({ ...form, tender_code: v })} /></Field>
            {[1,2,3,4,5].map(lv => (
              <Field key={lv} label={`Lv${lv} code / name`} className="col-span-2">
                <div className="grid grid-cols-3 gap-2">
                  <Text value={form[`lv${lv}_code`]} onChange={v => setForm({ ...form, [`lv${lv}_code`]: v })}
                    placeholder={`Lv${lv} code`} />
                  <Text value={form[`lv${lv}_name`]} onChange={v => setForm({ ...form, [`lv${lv}_name`]: v })}
                    placeholder={`Lv${lv} name`} className="col-span-2" />
                </div>
              </Field>
            ))}
          </Section>

          <Section title="Description & specification">
            <Field label="Description *" className="col-span-2">
              <TextArea value={form.description} onChange={v => setForm({ ...form, description: v })} />
            </Field>
            <Field label="Material"><Text value={form.material}
              onChange={v => setForm({ ...form, material: v })} /></Field>
            <Field label="Material code"><Text value={form.material_code}
              onChange={v => setForm({ ...form, material_code: v })} /></Field>
            <Field label="Color"><Text value={form.color}
              onChange={v => setForm({ ...form, color: v })} /></Field>
            <Field label="Color code"><Text value={form.color_code}
              onChange={v => setForm({ ...form, color_code: v })} /></Field>
            <Field label="Other (Type)"><Text value={form.other_type}
              onChange={v => setForm({ ...form, other_type: v })} /></Field>
            <Field label="Other (Value)"><Text value={form.other_value}
              onChange={v => setForm({ ...form, other_value: v })} /></Field>
          </Section>

          <Section title="Location & dimensions" defaultOpen={false}>
            <Field label="Room"><Text value={form.room}
              onChange={v => setForm({ ...form, room: v })} /></Field>
            <Field label="Floor"><Text value={form.floor}
              onChange={v => setForm({ ...form, floor: v })} /></Field>
            <Field label="Width / Ø"><Num value={form.width}
              onChange={v => setForm({ ...form, width: v })} /></Field>
            <Field label="Depth / Length"><Num value={form.depth}
              onChange={v => setForm({ ...form, depth: v })} /></Field>
            <Field label="Height"><Num value={form.height}
              onChange={v => setForm({ ...form, height: v })} /></Field>
            <Field label="Thickness"><Num value={form.thickness}
              onChange={v => setForm({ ...form, thickness: v })} /></Field>
          </Section>

          <Section title="Quantity & budget">
            <Field label="Unit"><Text value={form.unit}
              onChange={v => setForm({ ...form, unit: v })} placeholder="m², m³, Lot, no." /></Field>
            <Field label="Availability">
              <Select value={form.availability} onChange={v => setForm({ ...form, availability: v })}
                options={['Included','Not included','Optional']} />
            </Field>
            <Field label="Material / Labour">
              <Select value={form.material_labour} onChange={v => setForm({ ...form, material_labour: v })}
                options={['M','L','M+L']} />
            </Field>
            <Field label="Quantity"><Num value={form.quantity}
              onChange={v => setForm({ ...form, quantity: v })} /></Field>
            <Field label="Historical price"><Num value={form.historical_price}
              onChange={v => setForm({ ...form, historical_price: v })} /></Field>
            <Field label="Historical FX rate"><Num value={form.historical_fx_rate}
              onChange={v => setForm({ ...form, historical_fx_rate: v })} /></Field>
            <Field label="Adjustment"><Num value={form.adjustment}
              onChange={v => setForm({ ...form, adjustment: v })} /></Field>
            <Field label="Budgeted unit rate"><Num value={form.budgeted_unit_rate}
              onChange={v => setForm({ ...form, budgeted_unit_rate: v })} /></Field>
            <Field label="Budgeted total (auto)" className="col-span-2">
              <input className="input bg-slate-50" disabled value={fmt.money(previewTotal, currency)} />
            </Field>
            <Field label="Remarks" className="col-span-2">
              <TextArea value={form.remarks} onChange={v => setForm({ ...form, remarks: v })} />
            </Field>
          </Section>
        </div>
      </Modal>
      </div>
    </div>
  );
}

function QuotesTab({ items, vendors, projectId, reload, currency, selected, setSelected }) {
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState(emptyQuote);

  const previewTotal = useMemo(() => {
    const matLab = (Number(form.material_price) || 0) + (Number(form.labor_cost) || 0);
    const fromComponents = (Number(form.primary_unit_price) || 0) + (Number(form.additional_unit_price) || 0);
    const rate = matLab > 0 ? matLab : fromComponents;
    return (Number(selected?.quantity) || 0) * rate;
  }, [form.material_price, form.labor_cost, form.primary_unit_price, form.additional_unit_price, selected]);

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
    const payload = { ...form, vendor_id: Number(form.vendor_id),
      project_id: Number(projectId), boq_item_id: selected.id };
    await api.post('/quotations', payload);
    setOpen(false); setForm(emptyQuote);
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
    <div className="grid lg:grid-cols-[300px,1fr] gap-4">
      <div className="card p-0 overflow-hidden max-h-[700px] flex flex-col">
        <div className="px-3 py-2 border-b bg-slate-50 text-xs font-semibold uppercase text-slate-600">
          BOQ Items
        </div>
        <div className="overflow-y-auto">
          {items.map(i => (
            <button key={i.id} onClick={() => setSelected(i)}
              className={`w-full text-left px-3 py-2 border-b text-sm ${
                selected?.id === i.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}>
              <div className="font-medium truncate">{i.description}</div>
              <div className="text-xs text-slate-500 flex justify-between mt-0.5">
                <span>{i.item_code || i.lv2_name || 'BOQ'} · {i.quote_count} quotes</span>
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
                    <div className="text-xs text-slate-500 font-mono">{selected.item_code}</div>
                    <div className="font-semibold">{selected.description}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[selected.lv2_name, selected.lv3_name, selected.lv4_name].filter(Boolean).join(' › ')}
                    </div>
                    <div className="text-sm text-slate-600 mt-2 flex gap-4 flex-wrap">
                      <span><b>{fmt.number(selected.quantity)}</b> {selected.unit || ''}</span>
                      <span>Rate: <b>{fmt.money(selected.budgeted_unit_rate, currency)}</b></span>
                      <span>Budget: <b>{fmt.money(selected.budgeted_total, currency)}</b></span>
                      {selected.material && <span>Material: <b>{selected.material}</b></span>}
                      {selected.color && <span>Color: <b>{selected.color}</b></span>}
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => setOpen(true)}>+ Add quotation</button>
                </div>
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="th">Vendor</th><th className="th">Status</th>
                        <th className="th text-right">Material</th><th className="th text-right">Labour</th>
                        <th className="th text-right">Unit Rate</th><th className="th text-right">Total</th>
                        <th className="th text-right">vs Budget</th><th className="th text-right">vs Lowest</th>
                        <th className="th">Payment</th><th className="th">Lead</th>
                        <th className="th">Spec override</th>
                        <th className="th">State</th><th className="th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.length === 0 && (
                        <tr><td colSpan={13} className="td text-center text-slate-500 py-8">
                          No quotations captured for this BOQ line yet.
                        </td></tr>
                      )}
                      {quotes.map(q => {
                        const vsBudget = q.quoted_total - selected.budgeted_total;
                        const vsLowest = q.quoted_total - lowest;
                        const overrideBits = [
                          q.ov_room && `Room: ${q.ov_room}`,
                          q.ov_floor && `Floor: ${q.ov_floor}`,
                          q.ov_color && `Color: ${q.ov_color}`,
                          q.ov_material && `Material: ${q.ov_material}`,
                          q.ov_width && `W: ${q.ov_width}`,
                          q.ov_depth && `D: ${q.ov_depth}`,
                          q.ov_height && `H: ${q.ov_height}`,
                          q.ov_thickness && `T: ${q.ov_thickness}`
                        ].filter(Boolean).join(' · ');
                        return (
                          <tr key={q.id} className={q.status === 'selected' ? 'bg-emerald-50' : 'hover:bg-slate-50'}>
                            <td className="td font-medium">
                              {q.vendor_name}
                              <div className="text-xs text-slate-500 font-mono">{q.vendor_code}</div>
                              {q.vendor_note && <div className="text-xs text-slate-500 italic mt-0.5" title={q.vendor_note}>
                                "{q.vendor_note.slice(0, 60)}{q.vendor_note.length > 60 ? '…' : ''}"</div>}
                            </td>
                            <td className="td"><StatusBadge status={q.vendor_status} /></td>
                            <td className="td text-right text-xs">{fmt.money(q.material_price, currency)}</td>
                            <td className="td text-right text-xs">{fmt.money(q.labor_cost, currency)}</td>
                            <td className="td text-right">{fmt.money(q.quoted_unit_rate, currency)}</td>
                            <td className="td text-right font-semibold">{fmt.money(q.quoted_total, currency)}</td>
                            <td className={`td text-right ${vsBudget > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {fmt.money(vsBudget, currency)}
                            </td>
                            <td className="td text-right text-xs">
                              {q.quoted_total === lowest
                                ? <span className="badge bg-emerald-100 text-emerald-800">Lowest</span>
                                : `+${fmt.money(vsLowest, currency)}`}
                            </td>
                            <td className="td text-xs">{q.payment_terms || '—'}</td>
                            <td className="td text-xs">{q.delivery_lead_time || '—'}</td>
                            <td className="td text-xs max-w-[180px] truncate" title={overrideBits}>
                              {overrideBits || '—'}
                            </td>
                            <td className="td"><StatusBadge status={q.status} /></td>
                            <td className="td whitespace-nowrap">
                              {q.status !== 'selected' && q.vendor_status === 'approved' &&
                                <button className="text-xs text-emerald-700 mr-2" onClick={() => award(q.id)}>Award</button>}
                              {q.vendor_status !== 'approved' && q.status !== 'selected' &&
                                <span className="text-xs text-amber-600 mr-2" title="Vendor must be approved">Approve vendor first</span>}
                              <button className="text-xs text-rose-600" onClick={() => removeQuote(q.id)}>Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)}
        title={`Add quotation${selected ? ` — ${selected.description.slice(0, 60)}` : ''}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={saveQuote}>Save quotation</button>
        </>}>
        <div className="space-y-3">
          <Section title="Vendor & pricing">
            <Field label="Vendor *" className="col-span-2">
              <Select value={form.vendor_id} onChange={v => setForm({ ...form, vendor_id: v })}
                options={[{ value: '', label: '— Select vendor —' },
                  ...vendors.map(v => ({ value: v.id, label: `${v.name} (${v.vendor_code})${v.status !== 'approved' ? ` · ${v.status}` : ''}` }))]} />
            </Field>
            <Field label="Material price"><Num value={form.material_price}
              onChange={v => setForm({ ...form, material_price: v })} /></Field>
            <Field label="Labor cost"><Num value={form.labor_cost}
              onChange={v => setForm({ ...form, labor_cost: v })} /></Field>
            <Field label="Primary unit price"><Num value={form.primary_unit_price}
              onChange={v => setForm({ ...form, primary_unit_price: v })} /></Field>
            <Field label="Primary quantity"><Num value={form.primary_quantity}
              onChange={v => setForm({ ...form, primary_quantity: v })} /></Field>
            <Field label="Additional unit price"><Num value={form.additional_unit_price}
              onChange={v => setForm({ ...form, additional_unit_price: v })} /></Field>
            <Field label="Additional quantity"><Num value={form.additional_quantity}
              onChange={v => setForm({ ...form, additional_quantity: v })} /></Field>
            <Field label="Total amount (auto)" className="col-span-2">
              <input className="input bg-slate-50" disabled value={fmt.money(previewTotal, currency)} />
            </Field>
            <Field label="Vendor's note" className="col-span-2">
              <TextArea value={form.vendor_note} onChange={v => setForm({ ...form, vendor_note: v })} />
            </Field>
          </Section>

          <Section title="Per-vendor spec overrides" defaultOpen={false}>
            <Field label="Room"><Text value={form.ov_room}
              onChange={v => setForm({ ...form, ov_room: v })} /></Field>
            <Field label="Floor"><Text value={form.ov_floor}
              onChange={v => setForm({ ...form, ov_floor: v })} /></Field>
            <Field label="Width / Ø"><Num value={form.ov_width}
              onChange={v => setForm({ ...form, ov_width: v })} /></Field>
            <Field label="Depth / Length"><Num value={form.ov_depth}
              onChange={v => setForm({ ...form, ov_depth: v })} /></Field>
            <Field label="Height"><Num value={form.ov_height}
              onChange={v => setForm({ ...form, ov_height: v })} /></Field>
            <Field label="Thickness"><Num value={form.ov_thickness}
              onChange={v => setForm({ ...form, ov_thickness: v })} /></Field>
            <Field label="Color"><Text value={form.ov_color}
              onChange={v => setForm({ ...form, ov_color: v })} /></Field>
            <Field label="Material"><Text value={form.ov_material}
              onChange={v => setForm({ ...form, ov_material: v })} /></Field>
          </Section>

          <Section title="Commercial terms" defaultOpen={false}>
            <Field label="Quote date"><input type="date" className="input" value={form.quote_date || ''}
              onChange={e => setForm({ ...form, quote_date: e.target.value })} /></Field>
            <Field label="Validity"><input type="date" className="input" value={form.validity_date || ''}
              onChange={e => setForm({ ...form, validity_date: e.target.value })} /></Field>
            <Field label="Payment terms"><Text value={form.payment_terms}
              onChange={v => setForm({ ...form, payment_terms: v })} placeholder="30% advance, 70% on delivery" /></Field>
            <Field label="Delivery lead time"><Text value={form.delivery_lead_time}
              onChange={v => setForm({ ...form, delivery_lead_time: v })} placeholder="4 weeks" /></Field>
            <Field label="Remarks" className="col-span-2"><TextArea value={form.remarks}
              onChange={v => setForm({ ...form, remarks: v })} /></Field>
          </Section>
        </div>
      </Modal>
    </div>
  );
}
