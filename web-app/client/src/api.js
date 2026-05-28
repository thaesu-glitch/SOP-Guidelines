const base = '/api';

async function request(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = 'Request failed';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p)
};

export const fmt = {
  money: (n, currency = 'USD') => new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 0
  }).format(Number(n) || 0),
  number: (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0),
  pct: (n) => `${(Number(n) || 0).toFixed(1)}%`,
  date: (s) => s ? new Date(s).toLocaleDateString() : '—'
};
