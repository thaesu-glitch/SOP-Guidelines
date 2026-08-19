import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const clients = db
    .prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY name COLLATE NOCASE')
    .all(req.userId);
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db
    .prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

router.post('/', (req, res) => {
  const { name, email, phone, address } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db
    .prepare('INSERT INTO clients (user_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)')
    .run(req.userId, name, email || null, phone || null, address || null);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const { name, email, phone, address } = req.body || {};
  db.prepare('UPDATE clients SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?').run(
    name ?? existing.name,
    email ?? existing.email,
    phone ?? existing.phone,
    address ?? existing.address,
    req.params.id
  );

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(client);
});

router.delete('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Client not found' });

  const invoiceCount = db
    .prepare('SELECT COUNT(*) AS n FROM invoices WHERE client_id = ?')
    .get(req.params.id).n;
  if (invoiceCount > 0) {
    return res.status(409).json({ error: 'Cannot delete a client that has invoices' });
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
