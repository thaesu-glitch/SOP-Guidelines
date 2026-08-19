import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { openFile } from '../api/download';
import { money, statusLabel, statusClass, todayIso } from '../lib/format';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

function emptyPayment() {
  return { amount: '', paymentDate: todayIso(), method: 'bank_transfer', reference: '', notes: '' };
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [payment, setPayment] = useState(emptyPayment());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.getInvoice(id).then(setInvoice).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  function updatePayment(field) {
    return (e) => setPayment((p) => ({ ...p, [field]: e.target.value }));
  }

  async function handleRecordPayment(e) {
    e.preventDefault();
    setError('');
    const amt = Number(payment.amount);
    if (!amt || amt <= 0) return setError('Enter a valid payment amount');

    setBusy(true);
    try {
      const updated = await api.recordPayment(id, { ...payment, amount: amt });
      setInvoice(updated);
      setPayment(emptyPayment());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePayment(paymentId) {
    if (!confirm('Remove this payment?')) return;
    try {
      const updated = await api.deletePayment(id, paymentId);
      setInvoice(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteInvoice() {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await api.deleteInvoice(id);
      navigate('/invoices');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !invoice) return <div className="alert alert-error">{error}</div>;
  if (!invoice) return <div className="page-loading">Loading…</div>;

  return (
    <div>
      <div className="section-header">
        <h1>{invoice.invoice_number}</h1>
        <div className="row-actions">
          <button className="btn btn-ghost" onClick={() => openFile(api.invoicePdfUrl(id))}>View PDF</button>
          <Link className="btn btn-ghost" to={`/invoices/${id}/edit`}>Edit</Link>
          <button className="btn btn-ghost btn-danger" onClick={handleDeleteInvoice}>Delete</button>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="invoice-summary">
        <div>
          <div className="label">Client</div>
          <div>{invoice.client?.name}</div>
        </div>
        <div>
          <div className="label">Issue date</div>
          <div>{invoice.issue_date}</div>
        </div>
        <div>
          <div className="label">Due date</div>
          <div>{invoice.due_date}</div>
        </div>
        <div>
          <div className="label">Status</div>
          <span className={statusClass(invoice.status)}>{statusLabel(invoice.status)}</span>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id}>
              <td>{it.description}</td>
              <td>{it.quantity}</td>
              <td>{money(it.unit_price)}</td>
              <td>{money(it.quantity * it.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals-box">
        <div><span>Subtotal</span><span>{money(invoice.subtotal)}</span></div>
        <div><span>Tax ({invoice.tax_rate}%)</span><span>{money(invoice.taxAmount)}</span></div>
        <div className="totals-final"><span>Total</span><span>{money(invoice.total)}</span></div>
        <div><span>Amount paid</span><span>{money(invoice.amountPaid)}</span></div>
        <div className="totals-final"><span>Balance due</span><span>{money(invoice.balanceDue)}</span></div>
      </div>

      {invoice.notes && (
        <div className="notes-box">
          <div className="label">Notes</div>
          <p>{invoice.notes}</p>
        </div>
      )}

      <h2>Payments</h2>
      <table className="table">
        <thead>
          <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th></th></tr>
        </thead>
        <tbody>
          {invoice.payments.map((p) => (
            <tr key={p.id}>
              <td>{p.payment_date}</td>
              <td>{money(p.amount)}</td>
              <td>{PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method}</td>
              <td>{p.reference}</td>
              <td><button className="btn btn-ghost btn-danger" onClick={() => handleDeletePayment(p.id)}>Remove</button></td>
            </tr>
          ))}
          {invoice.payments.length === 0 && (
            <tr><td colSpan={5} className="empty-cell">No payments recorded yet.</td></tr>
          )}
        </tbody>
      </table>

      {invoice.balanceDue > 0 && (
        <>
          <h3>Record a payment</h3>
          <form className="inline-form" onSubmit={handleRecordPayment}>
            <input type="number" min="0" step="0.01" placeholder="Amount" value={payment.amount} onChange={updatePayment('amount')} required />
            <input type="date" value={payment.paymentDate} onChange={updatePayment('paymentDate')} required />
            <select value={payment.method} onChange={updatePayment('method')}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input placeholder="Reference (optional)" value={payment.reference} onChange={updatePayment('reference')} />
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record payment'}</button>
          </form>
        </>
      )}
    </div>
  );
}
