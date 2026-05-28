import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/summary', (_req, res) => {
  const stats = {
    projects: db.prepare('SELECT COUNT(*) AS n FROM projects').get().n,
    active_projects: db.prepare(`SELECT COUNT(*) AS n FROM projects WHERE status IN ('planning','in_progress')`).get().n,
    vendors: db.prepare('SELECT COUNT(*) AS n FROM vendors').get().n,
    approved_vendors: db.prepare(`SELECT COUNT(*) AS n FROM vendors WHERE status='approved'`).get().n,
    pending_vendors: db.prepare(`SELECT COUNT(*) AS n FROM vendors WHERE status='pending'`).get().n,
    total_budget: db.prepare('SELECT COALESCE(SUM(budgeted_total),0) AS v FROM boq_items').get().v,
    total_awarded: db.prepare('SELECT COALESCE(SUM(awarded_total),0) AS v FROM boq_items').get().v,
    open_boq_items: db.prepare(`SELECT COUNT(*) AS n FROM boq_items WHERE status<>'awarded'`).get().n,
    quotations: db.prepare('SELECT COUNT(*) AS n FROM quotations').get().n
  };

  const variance_by_project = db.prepare(`
    SELECT p.id, p.code, p.name,
      COALESCE(SUM(b.budgeted_total),0) AS budgeted,
      COALESCE(SUM(b.awarded_total),0) AS awarded,
      COALESCE(SUM(b.awarded_total),0) - COALESCE(SUM(b.budgeted_total),0) AS variance
    FROM projects p LEFT JOIN boq_items b ON b.project_id=p.id
    GROUP BY p.id ORDER BY p.created_at DESC
  `).all();

  const top_vendors = db.prepare(`
    SELECT v.id, v.vendor_code, v.name, v.category, v.status,
      COUNT(DISTINCT pv.project_id) AS project_count,
      COALESCE(SUM(pv.contract_value),0) AS total_value
    FROM vendors v LEFT JOIN project_vendors pv ON pv.vendor_id=v.id
    GROUP BY v.id ORDER BY total_value DESC LIMIT 10
  `).all();

  const spend_by_category = db.prepare(`
    SELECT COALESCE(pv.category,'Unspecified') AS category,
      COALESCE(SUM(pv.contract_value),0) AS value,
      COUNT(DISTINCT pv.vendor_id) AS vendor_count
    FROM project_vendors pv GROUP BY pv.category ORDER BY value DESC
  `).all();

  res.json({ stats, variance_by_project, top_vendors, spend_by_category });
});

r.get('/vendor-matrix', (_req, res) => {
  const rows = db.prepare(`
    SELECT v.id AS vendor_id, v.vendor_code, v.name, v.category, v.status,
      p.id AS project_id, p.code AS project_code, p.name AS project_name,
      pv.contract_value, pv.awarded_date
    FROM vendors v
    JOIN project_vendors pv ON pv.vendor_id=v.id
    JOIN projects p ON p.id=pv.project_id
    ORDER BY v.name, p.code
  `).all();
  res.json(rows);
});

export default r;
