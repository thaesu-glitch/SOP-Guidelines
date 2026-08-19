import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { money, todayIso } from '../lib/format';

function emptyItem() {
  return { description: '', quantity: 1, unitPrice: 0 };
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listClients().then(setClients).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getInvoice(id)
      .then((inv) => {
        setClientId(String(inv.client_id));
        setIssueDate(inv.issue_date);
        setDueDate(inv.due_date);
        setTaxRate(inv.tax_rate);
        setNotes(inv.notes || '');
        setItems(inv.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unit_price })));
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!clientId) return setError('Please select a client');

    const payload = {
      clientId: Number(clientId),
      issueDate,
      dueDate,
      taxRate: Number(taxRate) || 0,
      notes,
      items: items
        .filter((it) => it.description.trim())
        .map((it) => ({ description: it.description, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0 })),
    };

    if (payload.items.length === 0) return setError('Add at least one line item');

    setBusy(true);
    try {
      const invoice = isEdit ? await api.updateInvoice(id, payload) : await api.createInvoice(payload);
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>{isEdit ? 'Edit invoice' : 'New invoice'}</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="card-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Client
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Tax rate (%)
            <input type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Issue date
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </label>
          <label>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
        </div>

        <h3>Line items</h3>
        <table className="table item-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td><input value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" /></td>
                <td><input type="number" min="0" step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="qty-input" /></td>
                <td><input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} className="qty-input" /></td>
                <td>{money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}</td>
                <td>
                  {items.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-danger" onClick={() => removeItem(idx)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-ghost" onClick={addItem}>+ Add line item</button>

        <div className="totals-box">
          <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div><span>Tax ({Number(taxRate) || 0}%)</span><span>{money(taxAmount)}</span></div>
          <div className="totals-final"><span>Total</span><span>{money(total)}</span></div>
        </div>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
