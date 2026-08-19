const TOKEN_KEY = 'invoice_app_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (raw) return res;

  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (isJson && data && data.error) || 'Request failed';
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  listClients: () => request('/clients'),
  createClient: (body) => request('/clients', { method: 'POST', body }),
  updateClient: (id, body) => request(`/clients/${id}`, { method: 'PUT', body }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  listInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (body) => request('/invoices', { method: 'POST', body }),
  updateInvoice: (id, body) => request(`/invoices/${id}`, { method: 'PUT', body }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  invoicePdfUrl: (id) => `/api/invoices/${id}/pdf`,

  recordPayment: (invoiceId, body) => request(`/invoices/${invoiceId}/payments`, { method: 'POST', body }),
  deletePayment: (invoiceId, paymentId) =>
    request(`/invoices/${invoiceId}/payments/${paymentId}`, { method: 'DELETE' }),

  summary: () => request('/reports/summary'),
  invoiceReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/invoices${qs ? `?${qs}` : ''}`);
  },
  paymentReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/payments${qs ? `?${qs}` : ''}`);
  },
  invoiceReportCsvUrl: (params = {}) => `/api/reports/invoices.csv?${new URLSearchParams(params).toString()}`,
  paymentReportCsvUrl: (params = {}) => `/api/reports/payments.csv?${new URLSearchParams(params).toString()}`,
};
