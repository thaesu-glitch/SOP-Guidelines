import { useState } from 'react';

export function Field({ label, children, className = '' }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}

export function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-t-lg">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-3 grid grid-cols-2 gap-3">{children}</div>}
    </div>
  );
}

export function Text({ value, onChange, ...rest }) {
  return <input className="input" value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest} />;
}

export function Num({ value, onChange, ...rest }) {
  return <input type="number" className="input" value={value ?? ''}
    onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} {...rest} />;
}

export function TextArea({ value, onChange, rows = 2, ...rest }) {
  return <textarea className="input" rows={rows} value={value ?? ''}
    onChange={e => onChange(e.target.value)} {...rest} />;
}

export function Select({ value, onChange, options, ...rest }) {
  return (
    <select className="input" value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
