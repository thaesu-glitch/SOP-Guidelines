import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { downloadFile } from '../api/download';
import { money, statusLabel, statusClass, methodLabel } from '../lib/format';

export default function Reports() {
  const [tab, setTab] = useState('invoices');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState('');

  const params = { ...(from ? { from } : {}), ...(to ? { to } : {}) };

  useEffect(() => {
    setError('');
    if (tab === 'invoices') {
      api.invoiceReport(params).then(setInvoiceData).catch((err) => setError(err.message));
    } else {
      api.paymentReport(params).then(setPaymentData).catch((err) => setError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to]);

  async function handleExport() {
    try {
      if (tab === 'invoices') {
        await downloadFile(api.invoiceReportCsvUrl(params), 'invoice-report.csv');
      } else {
        await downloadFile(api.paymentReportCsvUrl(params), 'payment-report.csv');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Reports</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button className={tab === 'invoices' ? 'tab active' : 'tab'} onClick={() => setTab('invoices')}>Invoice report</button>
        <button className={tab === 'payments' ? 'tab active' : 'tab'} onClick={() => setTab('payments')}>Payment report</button>
      </div>

      <div className="filters">
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="btn btn-ghost" onClick={handleExport}>Export CSV</button>
      </div>

      {tab === 'invoices' && invoiceData && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th><th>Client</th><th>Issue date</th><th>Due date</th>
                <th>Status</th><th>Total</th><th>Paid</th><th>Balance due</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.invoiceNumber}</td>
                  <td>{i.clientName}</td>
                  <td>{i.issueDate}</td>
                  <td>{i.dueDate}</td>
                  <td><span className={statusClass(i.status)}>{statusLabel(i.status)}</span></td>
                  <td>{money(i.total)}</td>
                  <td>{money(i.amountPaid)}</td>
                  <td>{money(i.balanceDue)}</td>
                </tr>
              ))}
              {invoiceData.invoices.length === 0 && (
                <tr><td colSpan={8} className="empty-cell">No invoices in this range.</td></tr>
              )}
            </tbody>
            {invoiceData.invoices.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5}>Totals</td>
                  <td>{money(invoiceData.totals.total)}</td>
                  <td>{money(invoiceData.totals.amountPaid)}</td>
                  <td>{money(invoiceData.totals.balanceDue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </>
      )}

      {tab === 'payments' && paymentData && (
        <>
          <table className="table">
            <thead>
              <tr><th>Invoice #</th><th>Client</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {paymentData.payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.invoiceNumber}</td>
                  <td>{p.clientName}</td>
                  <td>{p.paymentDate}</td>
                  <td>{money(p.amount)}</td>
                  <td>{methodLabel(p.method)}</td>
                  <td>{p.reference}</td>
                </tr>
              ))}
              {paymentData.payments.length === 0 && (
                <tr><td colSpan={6} className="empty-cell">No payments in this range.</td></tr>
              )}
            </tbody>
            {paymentData.payments.length > 0 && (
              <tfoot>
                <tr><td colSpan={3}>Total collected</td><td>{money(paymentData.totalCollected)}</td><td colSpan={2}></td></tr>
              </tfoot>
            )}
          </table>
        </>
      )}
    </div>
  );
}
