export function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Unpaid',
  partial: 'Partially Paid',
  partial_overdue: 'Partially Paid (Overdue)',
  overdue: 'Overdue',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const STATUS_CLASSES = {
  draft: 'badge badge-gray',
  sent: 'badge badge-blue',
  partial: 'badge badge-amber',
  partial_overdue: 'badge badge-red',
  overdue: 'badge badge-red',
  paid: 'badge badge-green',
  cancelled: 'badge badge-gray',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function statusClass(status) {
  return STATUS_CLASSES[status] || 'badge badge-gray';
}

export const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

export function methodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
