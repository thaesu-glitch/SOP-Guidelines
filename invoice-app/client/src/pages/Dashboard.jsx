import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { money, statusLabel, statusClass } from '../lib/format';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.summary(), api.listInvoices()])
      .then(([s, invoices]) => {
        setSummary(s);
        setRecent(invoices.slice(0, 5));
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!summary) return <div className="page-loading">Loading…</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total invoiced</div>
          <div className="stat-value">{money(summary.totalInvoiced)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total collected</div>
          <div className="stat-value stat-green">{money(summary.totalCollected)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value stat-amber">{money(summary.totalOutstanding)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue ({summary.overdueCount})</div>
          <div className="stat-value stat-red">{money(summary.overdueAmount)}</div>
        </div>
      </div>

      <div className="section-header">
        <h2>Recent invoices</h2>
        <Link className="btn btn-primary" to="/invoices/new">+ New invoice</Link>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Client</th>
            <th>Due date</th>
            <th>Status</th>
            <th>Balance due</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((inv) => (
            <tr key={inv.id}>
              <td><Link to={`/invoices/${inv.id}`}>{inv.invoice_number}</Link></td>
              <td>{inv.client?.name}</td>
              <td>{inv.due_date}</td>
              <td><span className={statusClass(inv.status)}>{statusLabel(inv.status)}</span></td>
              <td>{money(inv.balanceDue)}</td>
            </tr>
          ))}
          {recent.length === 0 && (
            <tr><td colSpan={5} className="empty-cell">No invoices yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
