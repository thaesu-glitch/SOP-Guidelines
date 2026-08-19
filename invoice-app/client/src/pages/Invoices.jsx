import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { money, statusLabel, statusClass } from '../lib/format';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  function load() {
    api
      .listInvoices(statusFilter ? { status: statusFilter } : {})
      .then(setInvoices)
      .catch((err) => setError(err.message));
  }

  useEffect(load, [statusFilter]);

  return (
    <div>
      <div className="section-header">
        <h1>Invoices</h1>
        <Link className="btn btn-primary" to="/invoices/new">+ New invoice</Link>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Unpaid</option>
          <option value="partial">Partially paid</option>
          <option value="partial_overdue">Partially paid (overdue)</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Issue date</th>
            <th>Due date</th>
            <th>Status</th>
            <th>Total</th>
            <th>Balance due</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td><Link to={`/invoices/${inv.id}`}>{inv.invoice_number}</Link></td>
              <td>{inv.client?.name}</td>
              <td>{inv.issue_date}</td>
              <td>{inv.due_date}</td>
              <td><span className={statusClass(inv.status)}>{statusLabel(inv.status)}</span></td>
              <td>{money(inv.total)}</td>
              <td>{money(inv.balanceDue)}</td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr><td colSpan={7} className="empty-cell">No invoices found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
