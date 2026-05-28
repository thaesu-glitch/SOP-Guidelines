import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const { project_id, vendor_id } = req.query;
  const where = []; const vals = [];
  if (project_id) { where.push('pv.project_id=?'); vals.push(project_id); }
  if (vendor_id) { where.push('pv.vendor_id=?'); vals.push(vendor_id); }
  const sql = `
    SELECT pv.*, v.vendor_code, v.name AS vendor_name, v.status AS vendor_status,
      p.code AS project_code, p.name AS project_name
    FROM project_vendors pv
    JOIN vendors v ON v.id=pv.vendor_id
    JOIN projects p ON p.id=pv.project_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY pv.awarded_date DESC
  `;
  res.json(db.prepare(sql).all(...vals));
});

r.post('/', (req, res) => {
  const { project_id, vendor_id, category, contract_value, awarded_date, awarded_by, remarks } = req.body;
  if (!project_id || !vendor_id) return res.status(400).json({ error: 'project_id and vendor_id required' });
  const info = db.prepare(`
    INSERT INTO project_vendors (project_id, vendor_id, category, contract_value, awarded_date, awarded_by, remarks)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(project_id, vendor_id, category) DO UPDATE SET
      contract_value = excluded.contract_value,
      awarded_date = excluded.awarded_date,
      awarded_by = excluded.awarded_by,
      remarks = excluded.remarks
  `).run(project_id, vendor_id, category || 'General', Number(contract_value) || 0,
         awarded_date || null, awarded_by || null, remarks || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM project_vendors WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
