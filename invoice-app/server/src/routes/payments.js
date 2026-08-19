import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getFullInvoice } from '../lib/invoiceSerializer.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

function loadInvoice(req, res) {
  const invoice = db
    .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
    .get(req.params.invoiceId, req.userId);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return null;
  }
  return invoice;
}

router.get('/', (req, res) => {
  if (!loadInvoice(req, res)) return;
  const payments = db
    .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date, id')
    .all(req.params.invoiceId);
  res.json(payments);
});

router.post('/', (req, res) => {
  const invoice = loadInvoice(req, res);
  if (!invoice) return;

  const { amount, paymentDate, method, reference, notes } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'amount must be a positive number' });
  if (!paymentDate) return res.status(400).json({ error: 'paymentDate is required' });

  db.prepare(
    'INSERT INTO payments (invoice_id, amount, payment_date, method, reference, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(invoice.id, amt, paymentDate, method || 'bank_transfer', reference || null, notes || null);

  res.status(201).json(getFullInvoice(invoice.id, req.userId));
});

router.delete('/:paymentId', (req, res) => {
  const invoice = loadInvoice(req, res);
  if (!invoice) return;

  const payment = db
    .prepare('SELECT * FROM payments WHERE id = ? AND invoice_id = ?')
    .get(req.params.paymentId, invoice.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.paymentId);
  res.json(getFullInvoice(invoice.id, req.userId));
});

export default router;
