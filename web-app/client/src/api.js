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

const moneyFmt = new Map();
function getMoneyFmt(currency) {
  const c = (currency || 'MMK').toUpperCase();
  if (!moneyFmt.has(c)) {
    try {
      moneyFmt.set(c, new Intl.NumberFormat('en-US', {
        style: 'currency', currency: c, maximumFractionDigits: 0
      }));
    } catch {
      moneyFmt.set(c, new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }));
    }
  }
  return moneyFmt.get(c);
}

export const fmt = {
  money: (n, currency = 'MMK') => {
    const num = Number(n) || 0;
    try { return getMoneyFmt(currency).format(num); }
    catch { return `${currency} ${num.toLocaleString()}`; }
  },
  number: (n) => new Intl.NumberFormat('en-US').format(Number(n) || 0),
  decimal: (n, d = 2) => Number(n) == null ? '—' : Number(n).toFixed(d),
  pct: (n) => `${(Number(n) || 0).toFixed(1)}%`,
  date: (s) => s ? new Date(s).toLocaleDateString() : '—'
};
