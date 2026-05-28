import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  const rows = db.prepare(`
    SELECT b.*, v.name AS awarded_vendor_name,
      (SELECT COUNT(*) FROM quotations WHERE boq_item_id=b.id) AS quote_count,
      (SELECT MIN(quoted_total) FROM quotations WHERE boq_item_id=b.id) AS lowest_quote
    FROM boq_items b
    LEFT JOIN vendors v ON v.id=b.awarded_vendor_id
    WHERE b.project_id=? ORDER BY b.section, b.item_code, b.id
  `).all(project_id);
  res.json(rows);
});

r.post('/', (req, res) => {
  const { project_id, section, item_code, description, unit, quantity, budgeted_unit_rate, remarks } = req.body;
  if (!project_id || !description) return res.status(400).json({ error: 'project_id and description required' });
  const qty = Number(quantity) || 0;
  const rate = Number(budgeted_unit_rate) || 0;
  const info = db.prepare(`
    INSERT INTO boq_items (project_id, section, item_code, description, unit, quantity,
      budgeted_unit_rate, budgeted_total, remarks)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(project_id, section || null, item_code || null, description, unit || null,
         qty, rate, qty * rate, remarks || null);
  res.status(201).json(db.prepare('SELECT * FROM boq_items WHERE id=?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const editable = ['section','item_code','description','unit','quantity','budgeted_unit_rate',
                    'awarded_unit_rate','awarded_vendor_id','status','remarks'];
  const current = db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });
  const next = { ...current, ...Object.fromEntries(editable.filter(k => k in req.body).map(k => [k, req.body[k]])) };
  next.budgeted_total = (Number(next.quantity) || 0) * (Number(next.budgeted_unit_rate) || 0);
  next.awarded_total = next.awarded_unit_rate != null ? (Number(next.quantity) || 0) * Number(next.awarded_unit_rate) : null;
  db.prepare(`
    UPDATE boq_items SET section=?, item_code=?, description=?, unit=?, quantity=?,
      budgeted_unit_rate=?, budgeted_total=?, awarded_unit_rate=?, awarded_total=?,
      awarded_vendor_id=?, status=?, remarks=? WHERE id=?
  `).run(next.section, next.item_code, next.description, next.unit, next.quantity,
         next.budgeted_unit_rate, next.budgeted_total, next.awarded_unit_rate, next.awarded_total,
         next.awarded_vendor_id, next.status, next.remarks, req.params.id);
  res.json(db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id));
});

r.post('/:id/award', (req, res) => {
  const { quotation_id } = req.body;
  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(quotation_id);
  const item = db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id);
  if (!q || !item) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE quotations SET status='rejected' WHERE boq_item_id=? AND id<>?`).run(req.params.id, quotation_id);
  db.prepare(`UPDATE quotations SET status='selected' WHERE id=?`).run(quotation_id);
  db.prepare(`
    UPDATE boq_items SET awarded_vendor_id=?, awarded_unit_rate=?, awarded_total=?, status='awarded'
    WHERE id=?
  `).run(q.vendor_id, q.quoted_unit_rate, q.quoted_total, req.params.id);

  const vendor = db.prepare('SELECT * FROM vendors WHERE id=?').get(q.vendor_id);
  db.prepare(`
    INSERT INTO project_vendors (project_id, vendor_id, category, contract_value, awarded_date)
    VALUES (?,?,?,?, date('now'))
    ON CONFLICT(project_id, vendor_id, category) DO UPDATE SET
      contract_value = contract_value + excluded.contract_value,
      awarded_date = excluded.awarded_date
  `).run(item.project_id, q.vendor_id, vendor.category || item.section || 'General', q.quoted_total);

  res.json(db.prepare('SELECT * FROM boq_items WHERE id=?').get(req.params.id));
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM boq_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
