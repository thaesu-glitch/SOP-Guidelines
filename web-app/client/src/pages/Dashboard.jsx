import { useEffect, useState } from 'react';
import { api, fmt } from '../api';
import { StatCard, StatusBadge } from '../components/Layout.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
         PieChart, Pie, Cell, Legend } from 'recharts';

const PIE = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6','#14b8a6','#f43f5e'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then(setData).catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="text-rose-600">Failed to load: {err}</div>;
  if (!data) return <div className="text-slate-500">Loading…</div>;

  const { stats, variance_by_project, top_vendors, spend_by_category } = data;
  const variance = stats.total_awarded - stats.total_budget;
  const variancePct = stats.total_budget ? (variance / stats.total_budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Projects" value={stats.active_projects} sub={`${stats.projects} total`} accent="indigo" />
        <StatCard label="Approved Vendors" value={stats.approved_vendors}
                  sub={`${stats.pending_vendors} pending · ${stats.vendors} total`} accent="emerald" />
        <StatCard label="Total Budget" value={fmt.money(stats.total_budget)}
                  sub={`Awarded ${fmt.money(stats.total_awarded)}`} accent="sky" />
        <StatCard label="Budget Variance" value={fmt.money(variance)}
                  sub={`${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs budget`}
                  accent={variance > 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Budget vs Awarded by Project</h3>
            <span className="text-xs text-slate-500">{variance_by_project.length} projects</span>
          </div>
          {variance_by_project.length === 0
            ? <Empty hint="Create a project and add BOQ items to see variance." />
            : <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={variance_by_project}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="code" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => fmt.money(v).replace('$','$ ')} />
                    <Tooltip formatter={v => fmt.money(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="budgeted" name="Budgeted" fill="#6366f1" />
                    <Bar dataKey="awarded" name="Awarded" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Spend by Category</h3>
          {spend_by_category.length === 0
            ? <Empty hint="Award BOQ items to vendors to see category spend." />
            : <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={spend_by_category} dataKey="value" nameKey="category"
                         cx="50%" cy="50%" outerRadius={100} label={d => d.category}>
                      {spend_by_category.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt.money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Top Vendors by Contract Value</h3>
        {top_vendors.length === 0
          ? <Empty hint="No vendors with awarded contracts yet." />
          : <table className="min-w-full">
              <thead><tr className="bg-slate-50">
                <th className="th">Vendor</th><th className="th">Code</th><th className="th">Category</th>
                <th className="th">Status</th><th className="th text-right">Projects</th>
                <th className="th text-right">Total Awarded</th>
              </tr></thead>
              <tbody>
                {top_vendors.map(v => (
                  <tr key={v.id}>
                    <td className="td font-medium">{v.name}</td>
                    <td className="td text-slate-500">{v.vendor_code}</td>
                    <td className="td">{v.category || '—'}</td>
                    <td className="td"><StatusBadge status={v.status} /></td>
                    <td className="td text-right">{v.project_count}</td>
                    <td className="td text-right font-medium">{fmt.money(v.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>}
      </div>
    </div>
  );
}

function Empty({ hint }) {
  return <div className="text-center text-slate-500 text-sm py-10">{hint}</div>;
}
