import { Router } from 'express';
import db from '../db.js';

const r = Router();

const QUOTE_EDITABLE = [
  'primary_unit_price','primary_quantity','additional_unit_price','additional_quantity',
  'material_price','labor_cost',
  'ov_room','ov_floor','ov_width','ov_depth','ov_height','ov_thickness',
  'ov_color','ov_material','vendor_note',
  'quote_date','validity_date','payment_terms','delivery_lead_time','status','remarks'
];

const safeNum = (v) => Number(v) || 0;

function recompute(q, item) {
  const matLab = safeNum(q.material_price) + safeNum(q.labor_cost);
  const fromComponents = safeNum(q.primary_unit_price) + safeNum(q.additional_unit_price);
  q.quoted_unit_rate = matLab > 0 ? matLab : fromComponents;
  const qty = safeNum(item.quantity);
  q.quoted_total = qty * q.quoted_unit_rate;
  return q;
}

r.get('/', (req, res) => {
  const { boq_item_id, project_id, vendor_id } = req.query;
  const where = []; const vals = [];
  if (boq_item_id) { where.push('q.boq_item_id=?'); vals.push(boq_item_id); }
  if (project_id) { where.push('q.project_id=?'); vals.push(project_id); }
  if (vendor_id) { where.push('q.vendor_id=?'); vals.push(vendor_id); }
  const sql = `
    SELECT q.*, v.name AS vendor_name, v.vendor_code, v.status AS vendor_status,
      b.description AS boq_description, b.item_code AS boq_item_code,
      b.budgeted_unit_rate, b.budgeted_total, b.quantity AS boq_quantity, b.unit AS boq_unit
    FROM quotations q
    JOIN vendors v ON v.id=q.vendor_id
    JOIN boq_items b ON b.id=q.boq_item_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY q.boq_item_id, q.quoted_total ASC
  `;
  res.json(db.prepare(sql).all(...vals));
});

r.post('/', (req, res) => {
  const { project_id, boq_item_id, vendor_id } = req.body;
  if (!project_id || !boq_item_id || !vendor_id) {
    return res.status(400).json({ error: 'project_id, boq_item_id and vendor_id are required' });
  }
  const item = db.prepare('SELECT quantity FROM boq_items WHERE id=?').get(boq_item_id);
  if (!item) return res.status(404).json({ error: 'BOQ item not found' });
  const payload = Object.fromEntries(QUOTE_EDITABLE.filter(k => k in req.body).map(k => [k, req.body[k]]));
  const defaults = {
    status: 'received',
    primary_unit_price: 0, primary_quantity: 0,
    additional_unit_price: 0, additional_quantity: 0,
    material_price: 0, labor_cost: 0
  };
  const q = recompute({ ...defaults, ...payload }, item);
  const cols = ['project_id','boq_item_id','vendor_id', ...QUOTE_EDITABLE, 'quoted_unit_rate','quoted_total'];
  const vals = cols.map(c =>
    c === 'project_id' ? project_id :
    c === 'boq_item_id' ? boq_item_id :
    c === 'vendor_id' ? vendor_id : q[c] ?? null
  );
  const placeholders = cols.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO quotations (${cols.join(',')}) VALUES (${placeholders})`).run(...vals);
  res.status(201).json(db.prepare('SELECT * FROM quotations WHERE id=?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });
  const item = db.prepare('SELECT quantity FROM boq_items WHERE id=?').get(current.boq_item_id);
  const updates = Object.fromEntries(QUOTE_EDITABLE.filter(k => k in req.body).map(k => [k, req.body[k]]));
  const next = recompute({ ...current, ...updates }, item);
  const cols = [...QUOTE_EDITABLE, 'quoted_unit_rate','quoted_total'];
  const sets = cols.map(c => `${c}=?`).join(',');
  const vals = cols.map(c => next[c]);
  db.prepare(`UPDATE quotations SET ${sets} WHERE id=?`).run(...vals, req.params.id);
  res.json(db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id));
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM quotations WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
