import { Router } from 'express';
import db from '../db.js';

const r = Router();

const BOQ_EDITABLE = [
  'item_code','tender_code',
  'lv1_code','lv1_name','lv2_code','lv2_name','lv3_code','lv3_name',
  'lv4_code','lv4_name','lv5_code','lv5_name',
  'room','floor','width','depth','height','thickness',
  'other_type','other_value','color','color_code','material','material_code',
  'description','unit','availability','material_labour',
  'quantity','historical_price','historical_fx_rate','adjustment','budgeted_unit_rate',
  'awarded_unit_rate','awarded_vendor_id','status','remarks'
];

const num = (v) => v === '' || v == null ? null : Number(v);
const safeNum = (v) => Number(v) || 0;

function computeTotals(item) {
  const qty = safeNum(item.quantity);
  const rate = safeNum(item.budgeted_unit_rate);
  const adj = safeNum(item.adjustment);
  item.budgeted_total = qty * rate + adj;
  item.awarded_total = item.awarded_unit_rate != null
    ? qty * Number(item.awarded_unit_rate) + adj : null;
  return item;
}

r.get('/', (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  const rows = db.prepare(`
    SELECT b.*, v.name AS awarded_vendor_name,
      (SELECT COUNT(*) FROM quotations WHERE boq_item_id=b.id) AS quote_count,
      (SELECT MIN(quoted_total) FROM quotations WHERE boq_item_id=b.id) AS lowest_quote
    FROM boq_items b
    LEFT JOIN vendors v ON v.id=b.awarded_vendor_id
    WHERE b.project_id=? ORDER BY b.lv1_code, b.lv2_code, b.lv3_code, b.lv4_code, b.lv5_code, b.id
  `).all(project_id);
  res.json(rows);
});

r.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

r.post('/', (req, res) => {
  const { project_id, description } = req.body;
  if (!project_id || !description) return res.status(400).json({ error: 'project_id and description required' });
  const payload = Object.fromEntries(BOQ_EDITABLE.filter(k => k in req.body).map(k => [k, req.body[k]]));
  const item = computeTotals({ status: 'pending', adjustment: 0, ...payload, description });
  const cols = ['project_id','description', ...BOQ_EDITABLE.filter(k => k !== 'description'), 'budgeted_total','awarded_total'];
  const vals = cols.map(c => c === 'project_id' ? project_id : (c in item ? item[c] : null));
  const placeholders = cols.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO boq_items (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
  res.status(201).json(db.prepare('SELECT * FROM boq_items WHERE id=?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });
  const updates = Object.fromEntries(BOQ_EDITABLE.filter(k => k in req.body).map(k => [k, req.body[k]]));
  const next = computeTotals({ ...current, ...updates });
  const cols = [...BOQ_EDITABLE, 'budgeted_total','awarded_total'];
  const sets = cols.map(c => `${c}=?`).join(',');
  const vals = cols.map(c => next[c]);
  db.prepare(`UPDATE boq_items SET ${sets} WHERE id=?`).run(...vals, req.params.id);
  res.json(db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id));
});

r.post('/:id/award', (req, res) => {
  const { quotation_id } = req.body;
  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(quotation_id);
  const item = db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id);
  if (!q || !item) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE quotations SET status='rejected' WHERE boq_item_id=? AND id<>?`).run(req.params.id, quotation_id);
  db.prepare(`UPDATE quotations SET status='selected' WHERE id=?`).run(quotation_id);
  const next = computeTotals({ ...item, awarded_unit_rate: q.quoted_unit_rate });
  db.prepare(`
    UPDATE boq_items SET awarded_vendor_id=?, awarded_unit_rate=?, awarded_total=?, status='awarded'
    WHERE id=?
  `).run(q.vendor_id, q.quoted_unit_rate, next.awarded_total, req.params.id);

  const vendor = db.prepare('SELECT * FROM vendors WHERE id=?').get(q.vendor_id);
  const category = vendor.category || item.lv2_name || item.lv3_name || 'General';
  db.prepare(`
    INSERT INTO project_vendors (project_id, vendor_id, category, contract_value, awarded_date)
    VALUES (?,?,?,?, date('now'))
    ON CONFLICT(project_id, vendor_id, category) DO UPDATE SET
      contract_value = contract_value + excluded.contract_value,
      awarded_date = excluded.awarded_date
  `).run(item.project_id, q.vendor_id, category, q.quoted_total);

  res.json(db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id));
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM boq_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
