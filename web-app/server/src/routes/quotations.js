import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const { boq_item_id, project_id, vendor_id } = req.query;
  const where = []; const vals = [];
  if (boq_item_id) { where.push('q.boq_item_id=?'); vals.push(boq_item_id); }
  if (project_id) { where.push('q.project_id=?'); vals.push(project_id); }
  if (vendor_id) { where.push('q.vendor_id=?'); vals.push(vendor_id); }
  const sql = `
    SELECT q.*, v.name AS vendor_name, v.vendor_code, v.status AS vendor_status,
      b.description AS boq_description, b.item_code AS boq_item_code, b.budgeted_unit_rate, b.budgeted_total
    FROM quotations q
    JOIN vendors v ON v.id=q.vendor_id
    JOIN boq_items b ON b.id=q.boq_item_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY q.boq_item_id, q.quoted_total ASC
  `;
  res.json(db.prepare(sql).all(...vals));
});

r.post('/', (req, res) => {
  const { project_id, boq_item_id, vendor_id, quoted_unit_rate, quote_date, validity_date,
          payment_terms, delivery_lead_time, status, remarks } = req.body;
  if (!project_id || !boq_item_id || !vendor_id) {
    return res.status(400).json({ error: 'project_id, boq_item_id and vendor_id are required' });
  }
  const item = db.prepare('SELECT quantity FROM boq_items WHERE id=?').get(boq_item_id);
  if (!item) return res.status(404).json({ error: 'BOQ item not found' });
  const rate = Number(quoted_unit_rate) || 0;
  const total = (Number(item.quantity) || 0) * rate;
  const info = db.prepare(`
    INSERT INTO quotations (project_id, boq_item_id, vendor_id, quoted_unit_rate, quoted_total,
      quote_date, validity_date, payment_terms, delivery_lead_time, status, remarks)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(project_id, boq_item_id, vendor_id, rate, total, quote_date || null, validity_date || null,
         payment_terms || null, delivery_lead_time || null, status || 'received', remarks || null);
  res.status(201).json(db.prepare('SELECT * FROM quotations WHERE id=?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });
  const editable = ['quoted_unit_rate','quote_date','validity_date','payment_terms',
                    'delivery_lead_time','status','remarks'];
  const next = { ...current, ...Object.fromEntries(editable.filter(k => k in req.body).map(k => [k, req.body[k]])) };
  const item = db.prepare('SELECT quantity FROM boq_items WHERE id=?').get(current.boq_item_id);
  next.quoted_total = (Number(item.quantity) || 0) * (Number(next.quoted_unit_rate) || 0);
  db.prepare(`
    UPDATE quotations SET quoted_unit_rate=?, quoted_total=?, quote_date=?, validity_date=?,
      payment_terms=?, delivery_lead_time=?, status=?, remarks=? WHERE id=?
  `).run(next.quoted_unit_rate, next.quoted_total, next.quote_date, next.validity_date,
         next.payment_terms, next.delivery_lead_time, next.status, next.remarks, req.params.id);
  res.json(db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id));
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM quotations WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
