import PDFDocument from 'pdfkit';

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Unpaid',
  partial: 'Partially Paid',
  partial_overdue: 'Partially Paid (Overdue)',
  overdue: 'Overdue',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export function generateInvoicePdf(invoice, user) {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text(user?.business_name || user?.name || 'Invoice', { continued: false });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#555').text(user?.email || '');
  doc.moveDown();

  doc.fillColor('#000').fontSize(16).text(`Invoice ${invoice.invoice_number}`);
  doc.fontSize(10).fillColor('#333');
  doc.text(`Issue date: ${invoice.issue_date}`);
  doc.text(`Due date: ${invoice.due_date}`);
  doc.text(`Status: ${STATUS_LABELS[invoice.status] || invoice.status}`);
  doc.moveDown();

  doc.fontSize(12).fillColor('#000').text('Bill to:');
  doc.fontSize(10).fillColor('#333');
  doc.text(invoice.client?.name || 'Unknown client');
  if (invoice.client?.email) doc.text(invoice.client.email);
  if (invoice.client?.address) doc.text(invoice.client.address);
  doc.moveDown();

  const tableTop = doc.y;
  doc.fontSize(10).fillColor('#000');
  doc.text('Description', 50, tableTop, { width: 240 });
  doc.text('Qty', 300, tableTop, { width: 60, align: 'right' });
  doc.text('Unit Price', 360, tableTop, { width: 90, align: 'right' });
  doc.text('Amount', 460, tableTop, { width: 90, align: 'right' });
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#ccc').stroke();

  let y = tableTop + 22;
  doc.fillColor('#333');
  for (const item of invoice.items) {
    const amount = item.quantity * item.unit_price;
    doc.text(item.description, 50, y, { width: 240 });
    doc.text(String(item.quantity), 300, y, { width: 60, align: 'right' });
    doc.text(money(item.unit_price), 360, y, { width: 90, align: 'right' });
    doc.text(money(amount), 460, y, { width: 90, align: 'right' });
    y += 20;
  }

  y += 10;
  doc.moveTo(300, y).lineTo(550, y).strokeColor('#ccc').stroke();
  y += 10;

  doc.fillColor('#000');
  doc.text('Subtotal', 360, y, { width: 90, align: 'right' });
  doc.text(money(invoice.subtotal), 460, y, { width: 90, align: 'right' });
  y += 18;
  doc.text(`Tax (${invoice.tax_rate}%)`, 360, y, { width: 90, align: 'right' });
  doc.text(money(invoice.taxAmount), 460, y, { width: 90, align: 'right' });
  y += 18;
  doc.fontSize(12).text('Total', 360, y, { width: 90, align: 'right' });
  doc.text(money(invoice.total), 460, y, { width: 90, align: 'right' });
  y += 20;
  doc.fontSize(10).fillColor('#333');
  doc.text('Amount paid', 360, y, { width: 90, align: 'right' });
  doc.text(money(invoice.amountPaid), 460, y, { width: 90, align: 'right' });
  y += 18;
  doc.fontSize(12).fillColor('#000').text('Balance due', 360, y, { width: 90, align: 'right' });
  doc.text(money(invoice.balanceDue), 460, y, { width: 90, align: 'right' });

  if (invoice.notes) {
    y += 40;
    doc.fontSize(10).fillColor('#000').text('Notes', 50, y);
    doc.fillColor('#333').text(invoice.notes, 50, y + 15, { width: 500 });
  }

  doc.end();
  return doc;
}
