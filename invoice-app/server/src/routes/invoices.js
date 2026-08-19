import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getFullInvoice, hydrateInvoice, nextInvoiceNumber } from '../lib/invoiceSerializer.js';
import { generateInvoicePdf } from '../lib/invoicePdf.js';

const router = Router();
router.use(requireAuth);

function saveItems(invoiceId, items) {
  db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(invoiceId);
  const insert = db.prepare(
    'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, sort_order) VALUES (?, ?, ?, ?, ?)'
  );
  items.forEach((item, idx) => {
    insert.run(invoiceId, item.description, Number(item.quantity) || 0, Number(item.unitPrice) || 0, idx);
  });
}

router.get('/', (req, res) => {
  const { status, clientId } = req.query;
  let rows = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(req.userId);
  if (clientId) rows = rows.filter((r) => String(r.client_id) === String(clientId));

  let invoices = rows.map(hydrateInvoice);
  if (status) invoices = invoices.filter((i) => i.status === status);

  invoices.sort((a, b) => (a.issue_date < b.issue_date ? 1 : -1));
  res.json(invoices);
});

router.get('/:id', (req, res) => {
  const invoice = getFullInvoice(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

router.get('/:id/pdf', (req, res) => {
  const invoice = getFullInvoice(req.params.id, req.userId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
  generateInvoicePdf(invoice, user).pipe(res);
});

router.post('/', (req, res) => {
  const { clientId, issueDate, dueDate, taxRate, notes, items, status } = req.body || {};
  if (!clientId || !issueDate || !dueDate || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'clientId, issueDate, dueDate and at least one item are required' });
  }

  const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(clientId, req.userId);
  if (!client) return res.status(400).json({ error: 'Invalid clientId' });

  const invoiceNumber = nextInvoiceNumber(req.userId);
  const result = db
    .prepare(
      `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, tax_rate, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.userId, clientId, invoiceNumber, issueDate, dueDate, Number(taxRate) || 0, notes || null, status === 'draft' ? 'draft' : 'sent');

  saveItems(result.lastInsertRowid, items);
  res.status(201).json(getFullInvoice(result.lastInsertRowid, req.userId));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  const { clientId, issueDate, dueDate, taxRate, notes, items, status } = req.body || {};

  if (clientId) {
    const client = db.prepare('SELECT id FROM clients WHERE id = ? AND user_id = ?').get(clientId, req.userId);
    if (!client) return res.status(400).json({ error: 'Invalid clientId' });
  }

  db.prepare(
    `UPDATE invoices SET client_id = ?, issue_date = ?, due_date = ?, tax_rate = ?, notes = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    clientId ?? existing.client_id,
    issueDate ?? existing.issue_date,
    dueDate ?? existing.due_date,
    taxRate !== undefined ? Number(taxRate) : existing.tax_rate,
    notes !== undefined ? notes : existing.notes,
    status ?? existing.status,
    req.params.id
  );

  if (Array.isArray(items)) saveItems(req.params.id, items);

  res.json(getFullInvoice(req.params.id, req.userId));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
