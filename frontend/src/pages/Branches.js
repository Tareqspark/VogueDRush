import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const TABS = ['Overview', 'Branches', 'Transfers', 'Data Isolation', 'Comparative Report'];

const PATH_MAP = {
  '':          'Overview',
  'setup':     'Branches',
  'transfers': 'Transfers',
  'access':    'Data Isolation',
  'isolation': 'Data Isolation',
  'dashboard': 'Comparative Report',
};
const TAB_PATH = {
  'Overview':           '',
  'Branches':           'setup',
  'Transfers':          'transfers',
  'Data Isolation':     'access',
  'Comparative Report': 'dashboard',
};

const BRANCHES = [
  { id: 1, name: 'FoodPark Downtown',   city: 'Abu Dhabi', manager: 'Ali Hassan',   tables: 40, staff: 18, revenue: 128500.00, orders: 1480, avgCheck: 86.8,  covers: 4200, rating: 4.7, status: 'open' },
  { id: 2, name: 'FoodPark Marina',     city: 'Abu Dhabi', manager: 'Sara Malik',   tables: 30, staff: 14, revenue: 94200.00,  orders: 1120, avgCheck: 84.1,  covers: 3100, rating: 4.5, status: 'open' },
  { id: 3, name: 'FoodPark Airport',    city: 'Abu Dhabi', manager: 'James O.',     tables: 20, staff: 10, revenue: 62400.00,  orders: 920,  avgCheck: 67.8,  covers: 2200, rating: 4.2, status: 'open' },
  { id: 4, name: 'FoodPark Al Ain',     city: 'Al Ain',    manager: 'Priya Nair',   tables: 35, staff: 16, revenue: 88100.00,  orders: 1050, avgCheck: 83.9,  covers: 2900, rating: 4.6, status: 'open' },
  { id: 5, name: 'FoodPark Dubai DIFC', city: 'Dubai',     manager: 'Carlos M.',    tables: 50, staff: 22, revenue: 156800.00, orders: 1820, avgCheck: 86.2,  covers: 5100, rating: 4.8, status: 'open' },
];

const TRANSFERS = [
  { id: 1, date: '2026-05-05', item: 'Mozzarella Cheese',   qty: '5 kg',   from: 'FoodPark Downtown',   to: 'FoodPark Marina',     status: 'completed', value: 2100.00 },
  { id: 2, date: '2026-05-04', item: 'Heavy Cream',          qty: '8 ltr',  from: 'FoodPark Dubai DIFC', to: 'FoodPark Airport',    status: 'in_transit', value: 1160.00 },
  { id: 3, date: '2026-05-03', item: 'Chicken Breast',       qty: '10 kg',  from: 'FoodPark Al Ain',     to: 'FoodPark Downtown',   status: 'completed', value: 2800.00 },
  { id: 4, date: '2026-05-02', item: 'Basmati Rice',         qty: '20 kg',  from: 'FoodPark Dubai DIFC', to: 'FoodPark Al Ain',     status: 'pending',   value: 1900.00 },
];

const maxRevenue = Math.max(...BRANCHES.map(b => b.revenue));

const TRANSFER_STYLE = {
  completed:  'bg-emerald-50 text-emerald-700',
  in_transit: 'bg-sky-50 text-sky-700',
  pending:    'bg-amber-50 text-amber-700',
};

export default function Branches() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath  = location.pathname.replace(/^\/branches\/?/, '');
  const tab      = PATH_MAP[subPath] || 'Overview';
  const setTab   = (t) => navigate(TAB_PATH[t] ? `/branches/${TAB_PATH[t]}` : '/branches');

  const totalRevenue  = BRANCHES.reduce((s, b) => s + b.revenue, 0);
  const totalCovers   = BRANCHES.reduce((s, b) => s + b.covers, 0);
  const bestBranch    = BRANCHES.reduce((a, b) => b.revenue > a.revenue ? b : a);
  const avgCheck      = (BRANCHES.reduce((s, b) => s + b.avgCheck, 0) / BRANCHES.length).toFixed(1);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Multi-Branch Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module K · Branch Setup · Centralised Control · Stock Transfers · Comparative Analytics</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Branch</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Branches',     val: BRANCHES.length,                          sub: '3 cities · 5 locations', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Combined Revenue',   val: `AED ${(totalRevenue/1000).toFixed(0)}K`, sub: 'May 2026 YTD',            color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Top Branch',         val: bestBranch.name.replace('FoodPark ', ''), sub: `AED ${(bestBranch.revenue/1000).toFixed(0)}K revenue`, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Network Avg Check',  val: `AED ${avgCheck}`,                        sub: `${totalCovers.toLocaleString()} total covers`, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'text-sky-700 border-sky-500 bg-sky-50/40' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Overview' && (
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Revenue by Branch</p>
              <div className="space-y-3">
                {BRANCHES.sort((a,b) => b.revenue - a.revenue).map(b => {
                  const pct = (b.revenue / maxRevenue) * 100;
                  return (
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-700">{b.name}</span>
                          <span className="text-xs text-slate-400">{b.city}</span>
                        </div>
                        <span className="text-sm font-black text-slate-700">AED {(b.revenue/1000).toFixed(0)}K</span>
                      </div>
                      <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                          <span className="text-xs font-bold text-slate-500">{b.covers.toLocaleString()} covers</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'Branches' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Branch</th><th>City</th><th>Manager</th><th>Tables</th><th>Staff</th><th>Revenue (MTD)</th><th>Orders</th><th>Avg Check</th><th>Rating</th><th>Status</th></tr></thead>
                <tbody>
                  {BRANCHES.map(b => (
                    <tr key={b.id}>
                      <td className="font-semibold text-slate-800">{b.name}</td>
                      <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{b.city}</span></td>
                      <td className="text-xs text-slate-500">{b.manager}</td>
                      <td className="text-center text-slate-600">{b.tables}</td>
                      <td className="text-center text-slate-600">{b.staff}</td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {b.revenue.toLocaleString()}</td>
                      <td className="text-center font-bold text-sky-700">{b.orders.toLocaleString()}</td>
                      <td className="font-mono text-xs text-slate-600">AED {b.avgCheck}</td>
                      <td className="font-bold text-amber-600">★ {b.rating}</td>
                      <td><span className="status-badge bg-emerald-50 text-emerald-700">{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Transfers' && (
            <div>
              <div className="flex justify-between mb-4">
                <p className="text-sm text-slate-500">Inter-branch ingredient transfers. Stock is debited from source and credited to destination.</p>
                <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> New Transfer</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>From</th><th>To</th><th>Value</th><th>Status</th></tr></thead>
                  <tbody>
                    {TRANSFERS.map(t => (
                      <tr key={t.id}>
                        <td className="text-xs text-slate-500">{t.date}</td>
                        <td className="font-semibold text-slate-800">{t.item}</td>
                        <td className="font-mono text-xs text-slate-600">{t.qty}</td>
                        <td className="text-xs text-rose-600 font-semibold">{t.from}</td>
                        <td className="text-xs text-emerald-600 font-semibold">{t.to}</td>
                        <td className="font-mono text-xs font-bold text-slate-700">AED {t.value.toLocaleString()}</td>
                        <td><span className={`status-badge ${TRANSFER_STYLE[t.status]}`}>{t.status.replace('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Comparative Report' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Side-by-side performance comparison across all branches — May 2026.</p>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {BRANCHES.map(b => <th key={b.id} className="text-center">{b.name.replace('FoodPark ', '')}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Revenue (AED)', values: BRANCHES.map(b => b.revenue.toLocaleString()), best: Math.max(...BRANCHES.map(b=>b.revenue)) },
                      { label: 'Orders',        values: BRANCHES.map(b => b.orders.toLocaleString()),  best: Math.max(...BRANCHES.map(b=>b.orders)) },
                      { label: 'Avg Check',     values: BRANCHES.map(b => `AED ${b.avgCheck}`),        best: Math.max(...BRANCHES.map(b=>b.avgCheck)) },
                      { label: 'Covers',        values: BRANCHES.map(b => b.covers.toLocaleString()),  best: Math.max(...BRANCHES.map(b=>b.covers)) },
                      { label: 'Avg Rating',    values: BRANCHES.map(b => `★ ${b.rating}`),            best: Math.max(...BRANCHES.map(b=>b.rating)) },
                    ].map(row => (
                      <tr key={row.label}>
                        <td className="font-semibold text-slate-700">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className={`text-center text-sm ${v === row.values.reduce((a, b) => {
                            const na = parseFloat(a.replace(/[^0-9.]/g,''));
                            const nb = parseFloat(b.replace(/[^0-9.]/g,''));
                            return nb > na ? b : a;
                          }) ? 'font-black text-emerald-700 bg-emerald-50' : 'text-slate-600'}`}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Data Isolation' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: 'Branches Isolated', val: BRANCHES.length, sub: 'Separate DB schemas', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  { label: 'Cross-Branch APIs', val: '0', sub: 'No data leaks detected', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
                  { label: 'Role Scope Tests', val: '14/14', sub: 'All passed', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
                ].map(k => (
                  <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
                    <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
                    <p className="text-xs text-slate-500">{k.sub}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">Role Scoping — Access Control Matrix</p>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>User</th><th>Branch</th><th>Role</th><th>Own Branch</th><th>Other Branches</th><th>HQ Reports</th><th>Status</th></tr></thead>
                    <tbody>
                      {[
                        { user: 'Ahmed Al Rashidi', branch: 'Downtown',  role: 'Manager',       own: '✅', other: '🚫', hq: '🚫', ok: true  },
                        { user: 'Priya Nair',        branch: 'Marina',    role: 'Cashier',       own: '✅', other: '🚫', hq: '🚫', ok: true  },
                        { user: 'Carlos Mendez',     branch: 'All',       role: 'HQ Admin',      own: '✅', other: '✅', hq: '✅', ok: true  },
                        { user: 'Sara Malik',        branch: 'JBR',       role: 'Kitchen Staff', own: '✅', other: '🚫', hq: '🚫', ok: true  },
                        { user: 'James Okafor',      branch: 'Downtown',  role: 'Waiter',        own: '✅', other: '🚫', hq: '🚫', ok: true  },
                      ].map((r, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-slate-800">{r.user}</td>
                          <td className="text-xs text-slate-500">{r.branch}</td>
                          <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.role}</span></td>
                          <td className="text-center text-sm">{r.own}</td>
                          <td className="text-center text-sm">{r.other}</td>
                          <td className="text-center text-sm">{r.hq}</td>
                          <td><span className={`status-badge ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{r.ok ? 'pass' : 'fail'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-700 mb-3">Isolation Architecture</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { label: 'DB Schema', desc: 'Each branch uses a prefixed schema (branch_1_, branch_2_). Row-level security enforced via Postgres RLS policies.', ok: true },
                    { label: 'API Gateway', desc: 'JWT token contains branchId claim. Middleware rejects cross-branch requests with HTTP 403.', ok: true },
                    { label: 'Socket.IO Rooms', desc: 'Each branch socket joins room `branch:{id}`. Events are namespaced and cannot bleed across rooms.', ok: true },
                    { label: 'Report Aggregation', desc: 'HQ admins can query all branches using `?branch=all`. Branch managers restricted to own branchId.', ok: true },
                  ].map(item => (
                    <div key={item.label} className="flex gap-3 items-start rounded-lg bg-white border border-slate-200 p-3">
                      <span className="text-lg">{item.ok ? '✅' : '❌'}</span>
                      <div>
                        <p className="font-bold text-slate-700">{item.label}</p>
                        <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
