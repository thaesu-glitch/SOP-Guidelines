import { db } from '../db/index.js';
import { computeInvoiceTotals, deriveStatus } from './invoiceCalc.js';

export function getFullInvoice(invoiceId, userId) {
  const invoice = db
    .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
    .get(invoiceId, userId);
  if (!invoice) return null;
  return hydrateInvoice(invoice);
}

export function hydrateInvoice(invoice) {
  const items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id')
    .all(invoice.id);
  const payments = db
    .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date, id')
    .all(invoice.id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(invoice.client_id);

  const { subtotal, taxAmount, total } = computeInvoiceTotals(items, invoice.tax_rate);
  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = Math.max(0, total - amountPaid);
  const status = deriveStatus({
    total,
    amountPaid,
    dueDate: invoice.due_date,
    currentStatus: invoice.status,
  });

  if (status !== invoice.status) {
    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, invoice.id);
  }

  return {
    ...invoice,
    status,
    client,
    items,
    payments,
    subtotal,
    taxAmount,
    total,
    amountPaid,
    balanceDue,
  };
}

export function nextInvoiceNumber(userId) {
  const year = new Date().getFullYear();
  const row = db
    .prepare(
      `SELECT invoice_number FROM invoices
       WHERE user_id = ? AND invoice_number LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(userId, `INV-${year}-%`);

  let seq = 1;
  if (row) {
    const parts = row.invoice_number.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}
