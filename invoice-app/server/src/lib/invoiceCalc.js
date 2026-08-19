export function computeInvoiceTotals(items, taxRate) {
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

export function deriveStatus({ total, amountPaid, dueDate, currentStatus }) {
  if (currentStatus === 'draft' || currentStatus === 'cancelled') return currentStatus;

  const epsilon = 0.005;
  if (amountPaid >= total - epsilon) return 'paid';
  if (amountPaid > epsilon) {
    return isOverdue(dueDate) ? 'partial_overdue' : 'partial';
  }
  return isOverdue(dueDate) ? 'overdue' : 'sent';
}

function isOverdue(dueDate) {
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}
