import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const { status, category } = req.query;
  const where = []; const vals = [];
  if (status) { where.push('status=?'); vals.push(status); }
  if (category) { where.push('category=?'); vals.push(category); }
  const sql = `SELECT v.*,
    (SELECT COUNT(DISTINCT project_id) FROM project_vendors WHERE vendor_id=v.id) AS project_count,
    (SELECT COALESCE(SUM(contract_value),0) FROM project_vendors WHERE vendor_id=v.id) AS total_contract_value
    FROM vendors v
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY v.name`;
  res.json(db.prepare(sql).all(...vals));
});

r.get('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  const projects = db.prepare(`
    SELECT pv.*, p.code AS project_code, p.name AS project_name
    FROM project_vendors pv JOIN projects p ON p.id=pv.project_id
    WHERE pv.vendor_id=? ORDER BY pv.awarded_date DESC
  `).all(req.params.id);
  res.json({ ...v, projects });
});

r.post('/', (req, res) => {
  const { vendor_code, name, category, contact_person, email, phone, address,
          registration_no, tax_id, status, approved_date, approved_by, notes } = req.body;
  if (!vendor_code || !name) return res.status(400).json({ error: 'vendor_code and name are required' });
  const info = db.prepare(`
    INSERT INTO vendors (vendor_code, name, category, contact_person, email, phone, address,
      registration_no, tax_id, status, approved_date, approved_by, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(vendor_code, name, category || null, contact_person || null, email || null, phone || null,
         address || null, registration_no || null, tax_id || null, status || 'pending',
         approved_date || null, approved_by || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM vendors WHERE id=?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const fields = ['vendor_code','name','category','contact_person','email','phone','address',
                  'registration_no','tax_id','status','approved_date','approved_by','notes'];
  const sets = []; const vals = [];
  for (const f of fields) if (f in req.body) { sets.push(`${f}=?`); vals.push(req.body[f]); }
  if (!sets.length) return res.json(db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id));
  vals.push(req.params.id);
  db.prepare(`UPDATE vendors SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json(db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id));
});

r.post('/:id/approve', (req, res) => {
  const { approved_by } = req.body;
  db.prepare(`UPDATE vendors SET status='approved', approved_date=date('now'), approved_by=? WHERE id=?`)
    .run(approved_by || null, req.params.id);
  res.json(db.prepare('SELECT * FROM vendors WHERE id=?').get(req.params.id));
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vendors WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
