import { useEffect, useMemo, useState } from 'react';
import { api, fmt } from '../api';
import { StatusBadge } from '../components/Layout.jsx';

export default function Approvals() {
  const [rows, setRows] = useState([]);

  useEffect(() => { api.get('/dashboard/vendor-matrix').then(setRows); }, []);

  const matrix = useMemo(() => {
    const vendors = new Map();
    const projects = new Map();
    for (const r of rows) {
      if (!vendors.has(r.vendor_id)) vendors.set(r.vendor_id, {
        id: r.vendor_id, code: r.vendor_code, name: r.name, category: r.category, status: r.status, total: 0
      });
      if (!projects.has(r.project_id)) projects.set(r.project_id, {
        id: r.project_id, code: r.project_code, name: r.project_name
      });
      vendors.get(r.vendor_id).total += r.contract_value || 0;
    }
    const grid = {};
    for (const r of rows) {
      grid[r.vendor_id] ??= {};
      grid[r.vendor_id][r.project_id] = (grid[r.vendor_id][r.project_id] || 0) + (r.contract_value || 0);
    }
    return {
      vendors: [...vendors.values()].sort((a, b) => b.total - a.total),
      projects: [...projects.values()].sort((a, b) => a.code.localeCompare(b.code)),
      grid
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Approved Vendor Matrix</h1>
        <p className="text-sm text-slate-500">Cross-project view: which vendors hold contracts on which projects, with contract values.</p>
      </div>

      {rows.length === 0
        ? <div className="card text-center text-slate-500 py-10">
            No awarded contracts yet. Award BOQ items to approved vendors to populate this matrix.
          </div>
        : <div className="card p-0 overflow-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="th sticky left-0 bg-slate-50">Vendor</th>
                  <th className="th">Category</th>
                  <th className="th">Status</th>
                  {matrix.projects.map(p => (
                    <th key={p.id} className="th text-right whitespace-nowrap" title={p.name}>{p.code}</th>
                  ))}
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.vendors.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="td sticky left-0 bg-white font-medium">
                      <div>{v.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{v.code}</div>
                    </td>
                    <td className="td">{v.category || '—'}</td>
                    <td className="td"><StatusBadge status={v.status} /></td>
                    {matrix.projects.map(p => {
                      const val = matrix.grid[v.id]?.[p.id];
                      return <td key={p.id} className={`td text-right ${val ? 'bg-emerald-50' : 'text-slate-300'}`}>
                        {val ? fmt.money(val) : '·'}
                      </td>;
                    })}
                    <td className="td text-right font-semibold">{fmt.money(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}
