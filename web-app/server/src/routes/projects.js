import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT p.*,
      (SELECT COALESCE(SUM(budgeted_total),0) FROM boq_items WHERE project_id=p.id) AS boq_budgeted,
      (SELECT COALESCE(SUM(awarded_total),0) FROM boq_items WHERE project_id=p.id) AS boq_awarded,
      (SELECT COUNT(*) FROM boq_items WHERE project_id=p.id) AS boq_count,
      (SELECT COUNT(DISTINCT vendor_id) FROM project_vendors WHERE project_id=p.id) AS vendor_count
    FROM projects p ORDER BY p.created_at DESC
  `).all();
  res.json(rows);
});

r.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

r.post('/', (req, res) => {
  const { code, name, client, location, start_date, end_date, status, budget_total, currency, notes } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  const info = db.prepare(`
    INSERT INTO projects (code, name, client, location, start_date, end_date, status, budget_total, currency, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(code, name, client || null, location || null, start_date || null, end_date || null,
         status || 'planning', Number(budget_total) || 0, currency || 'USD', notes || null);
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id=?').get(info.lastInsertRowid));
});

r.put('/:id', (req, res) => {
  const fields = ['code','name','client','location','start_date','end_date','status','budget_total','currency','notes'];
  const sets = []; const vals = [];
  for (const f of fields) if (f in req.body) { sets.push(`${f}=?`); vals.push(req.body[f]); }
  if (!sets.length) return res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id));
  vals.push(req.params.id);
  db.prepare(`UPDATE projects SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id));
});

r.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default r;
