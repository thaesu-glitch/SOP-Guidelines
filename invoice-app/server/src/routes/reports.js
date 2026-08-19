import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { hydrateInvoice } from '../lib/invoiceSerializer.js';
import { toCsv } from '../lib/csv.js';

const router = Router();
router.use(requireAuth);

function loadInvoicesInRange(userId, { from, to, status, clientId }) {
  let invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(userId).map(hydrateInvoice);

  if (from) invoices = invoices.filter((i) => i.issue_date >= from);
  if (to) invoices = invoices.filter((i) => i.issue_date <= to);
  if (status) invoices = invoices.filter((i) => i.status === status);
  if (clientId) invoices = invoices.filter((i) => String(i.client_id) === String(clientId));

  invoices.sort((a, b) => (a.issue_date < b.issue_date ? -1 : 1));
  return invoices;
}

function loadPaymentsInRange(userId, { from, to, method }) {
  let rows = db
    .prepare(
      `SELECT payments.*, invoices.invoice_number, invoices.client_id
       FROM payments
       JOIN invoices ON invoices.id = payments.invoice_id
       WHERE invoices.user_id = ?`
    )
    .all(userId);

  if (from) rows = rows.filter((p) => p.payment_date >= from);
  if (to) rows = rows.filter((p) => p.payment_date <= to);
  if (method) rows = rows.filter((p) => p.method === method);

  const clients = db.prepare('SELECT id, name FROM clients WHERE user_id = ?').all(userId);
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  rows = rows.map((p) => ({ ...p, client_name: clientMap[p.client_id] || 'Unknown' }));

  rows.sort((a, b) => (a.payment_date < b.payment_date ? -1 : 1));
  return rows;
}

router.get('/summary', (req, res) => {
  const invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(req.userId).map(hydrateInvoice);
  const active = invoices.filter((i) => i.status !== 'draft' && i.status !== 'cancelled');

  const totalInvoiced = active.reduce((sum, i) => sum + i.total, 0);
  const totalCollected = active.reduce((sum, i) => sum + i.amountPaid, 0);
  const totalOutstanding = active.reduce((sum, i) => sum + i.balanceDue, 0);
  const overdueInvoices = active.filter((i) => i.status === 'overdue' || i.status === 'partial_overdue');
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

  const byStatus = {};
  for (const inv of active) byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;

  res.json({
    invoiceCount: active.length,
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    overdueCount: overdueInvoices.length,
    overdueAmount,
    byStatus,
  });
});

router.get('/invoices', (req, res) => {
  const invoices = loadInvoicesInRange(req.userId, req.query);
  const totals = invoices.reduce(
    (acc, i) => {
      acc.subtotal += i.subtotal;
      acc.tax += i.taxAmount;
      acc.total += i.total;
      acc.amountPaid += i.amountPaid;
      acc.balanceDue += i.balanceDue;
      return acc;
    },
    { subtotal: 0, tax: 0, total: 0, amountPaid: 0, balanceDue: 0 }
  );

  res.json({
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoice_number,
      clientName: i.client?.name,
      issueDate: i.issue_date,
      dueDate: i.due_date,
      status: i.status,
      subtotal: i.subtotal,
      tax: i.taxAmount,
      total: i.total,
      amountPaid: i.amountPaid,
      balanceDue: i.balanceDue,
    })),
    totals,
  });
});

router.get('/invoices.csv', (req, res) => {
  const invoices = loadInvoicesInRange(req.userId, req.query);
  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'client_name', label: 'Client' },
    { key: 'issue_date', label: 'Issue Date' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'status', label: 'Status' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'tax', label: 'Tax' },
    { key: 'total', label: 'Total' },
    { key: 'amount_paid', label: 'Amount Paid' },
    { key: 'balance_due', label: 'Balance Due' },
  ];
  const rows = invoices.map((i) => ({
    invoice_number: i.invoice_number,
    client_name: i.client?.name,
    issue_date: i.issue_date,
    due_date: i.due_date,
    status: i.status,
    subtotal: i.subtotal.toFixed(2),
    tax: i.taxAmount.toFixed(2),
    total: i.total.toFixed(2),
    amount_paid: i.amountPaid.toFixed(2),
    balance_due: i.balanceDue.toFixed(2),
  }));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-report.csv"`);
  res.send(toCsv(columns, rows));
});

router.get('/payments', (req, res) => {
  const payments = loadPaymentsInRange(req.userId, req.query);
  const totals = payments.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    payments: payments.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice_number,
      clientName: p.client_name,
      amount: p.amount,
      paymentDate: p.payment_date,
      method: p.method,
      reference: p.reference,
    })),
    totalCollected: totals,
  });
});

router.get('/payments.csv', (req, res) => {
  const payments = loadPaymentsInRange(req.userId, req.query);
  const columns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'client_name', label: 'Client' },
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' },
    { key: 'reference', label: 'Reference' },
  ];
  const rows = payments.map((p) => ({ ...p, amount: p.amount.toFixed(2) }));

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="payment-report.csv"`);
  res.send(toCsv(columns, rows));
});

export default router;
