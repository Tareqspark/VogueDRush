import React, { useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const TABS = ['Suppliers', 'Ledger', 'Payables Aging', 'Performance'];

const SUPPLIERS = [
  { id: 1, name: 'Fresh Farm Ltd.',    category: 'Proteins',  contact: 'James O.',  phone: '+971-50-2341234', terms: 'NET-30', balance: 12400.00, score: 92, abc: 'A', status: 'active' },
  { id: 2, name: 'Dairy Direct',       category: 'Dairy',     contact: 'Sara M.',   phone: '+971-50-3456789', terms: 'NET-30', balance: 5600.00,  score: 88, abc: 'A', status: 'active' },
  { id: 3, name: 'Agro Foods',         category: 'Dry Goods', contact: 'Ali H.',    phone: '+971-55-4567890', terms: 'NET-45', balance: 14800.00, score: 74, abc: 'A', status: 'active' },
  { id: 4, name: 'Mediterranean Co.',  category: 'Oils',      contact: 'Marco D.',  phone: '+971-50-5678901', terms: 'NET-15', balance: 3700.00,  score: 81, abc: 'B', status: 'active' },
  { id: 5, name: 'Grain Masters',      category: 'Grains',    contact: 'Priya S.',  phone: '+971-55-6789012', terms: 'COD',    balance: 0,        score: 65, abc: 'B', status: 'active' },
  { id: 6, name: 'Beverage World',     category: 'Beverages', contact: 'Tom R.',    phone: '+971-50-7890123', terms: 'NET-30', balance: 2100.00,  score: 55, abc: 'C', status: 'active' },
  { id: 7, name: 'Premium Spices',     category: 'Spices',    contact: 'Fatima K.', phone: '+971-50-8901234', terms: 'COD',    balance: 0,        score: 70, abc: 'C', status: 'blacklisted' },
];

const LEDGER = [
  { id: 1, date: '2026-05-05', supplier: 'Fresh Farm Ltd.',  type: 'invoice',  ref: 'INV-FF-234',  debit: 0,       credit: 9300.00, balance: 12400.00 },
  { id: 2, date: '2026-05-04', supplier: 'Dairy Direct',     type: 'invoice',  ref: 'INV-DC-089',  debit: 0,       credit: 5600.00, balance: 5600.00 },
  { id: 3, date: '2026-05-03', supplier: 'Agro Foods',       type: 'payment',  ref: 'PAY-2026-041',debit: 8250.00, credit: 0,       balance: 6550.00 },
  { id: 4, date: '2026-05-02', supplier: 'Fresh Farm Ltd.',  type: 'debit_note',ref: 'DN-2026-012', debit: 840.00,  credit: 0,       balance: 3100.00 },
  { id: 5, date: '2026-05-01', supplier: 'Agro Foods',       type: 'invoice',  ref: 'INV-AF-178',  debit: 0,       credit: 6800.00, balance: 14800.00 },
];

const AGING = [
  { supplier: 'Agro Foods',         current: 0,       d30: 0,       d60: 6800.00, d90: 0,    overdue: 8000.00, total: 14800.00 },
  { supplier: 'Fresh Farm Ltd.',    current: 9300.00, d30: 3100.00, d60: 0,       d90: 0,    overdue: 0,       total: 12400.00 },
  { supplier: 'Dairy Direct',       current: 5600.00, d30: 0,       d60: 0,       d90: 0,    overdue: 0,       total: 5600.00 },
  { supplier: 'Mediterranean Co.',  current: 3700.00, d30: 0,       d60: 0,       d90: 0,    overdue: 0,       total: 3700.00 },
  { supplier: 'Beverage World',     current: 0,       d30: 2100.00, d60: 0,       d90: 0,    overdue: 0,       total: 2100.00 },
];

const PERFORMANCE = [
  { supplier: 'Fresh Farm Ltd.',   delivery: 94, quality: 97, price: 91, composite: 94, trend: '↑', deliveries: 48 },
  { supplier: 'Dairy Direct',      delivery: 88, quality: 95, price: 85, composite: 89, trend: '↑', deliveries: 32 },
  { supplier: 'Agro Foods',        delivery: 72, quality: 88, price: 78, composite: 79, trend: '↓', deliveries: 67 },
  { supplier: 'Mediterranean Co.', delivery: 85, quality: 90, price: 80, composite: 85, trend: '→', deliveries: 19 },
  { supplier: 'Grain Masters',     delivery: 61, quality: 78, price: 72, composite: 70, trend: '↓', deliveries: 14 },
];

const ABC_STYLE = { A: 'bg-emerald-100 text-emerald-800 font-black', B: 'bg-sky-100 text-sky-800 font-black', C: 'bg-slate-100 text-slate-600 font-bold' };

function ScoreBar({ value }) {
  const color = value >= 85 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold ${value >= 85 ? 'text-emerald-700' : value >= 70 ? 'text-amber-700' : 'text-rose-700'}`}>{value}</span>
    </div>
  );
}

export default function Suppliers() {
  const [tab, setTab] = useState('Suppliers');
  const [search, setSearch] = useState('');

  const totalAP       = SUPPLIERS.filter(s => s.status === 'active').reduce((s, x) => s + x.balance, 0);
  const overdueAP     = AGING.reduce((s, a) => s + a.overdue, 0);
  const avgScore      = Math.round(PERFORMANCE.reduce((s, p) => s + p.composite, 0) / PERFORMANCE.length);
  const activeCount   = SUPPLIERS.filter(s => s.status === 'active').length;

  const filtered = SUPPLIERS.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Supplier Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module C · Supplier CRM · Ledger · AP Aging · Performance · ABC Segmentation</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Supplier</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Suppliers',  val: activeCount,                           sub: '1 blacklisted',       color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'AP Outstanding',    val: `AED ${(totalAP/1000).toFixed(1)}K`,   sub: 'Total owed',          color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
          { label: 'Overdue AP',        val: `AED ${overdueAP.toLocaleString()}`,   sub: '> 60 days overdue',   color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
          { label: 'Avg Perf. Score',   val: `${avgScore}/100`,                     sub: '5 scored suppliers',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
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
          {tab === 'Suppliers' && (
            <div>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9 text-sm" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select w-auto text-sm"><option>All ABC</option><option>A-Class</option><option>B-Class</option><option>C-Class</option></select>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Supplier Name</th><th>Category</th><th>Contact</th><th>Terms</th><th>Balance</th><th>Perf. Score</th><th>ABC</th><th>Status</th></tr></thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id}>
                        <td className="font-semibold text-slate-800">{s.name}</td>
                        <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s.category}</span></td>
                        <td className="text-xs text-slate-500">{s.contact} · {s.phone}</td>
                        <td className="text-xs font-mono text-slate-600">{s.terms}</td>
                        <td className={`font-mono text-xs font-bold ${s.balance > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{s.balance > 0 ? `AED ${s.balance.toLocaleString()}` : '—'}</td>
                        <td><ScoreBar value={s.score} /></td>
                        <td><span className={`status-badge ${ABC_STYLE[s.abc]}`}>{s.abc}</span></td>
                        <td>
                          {s.status === 'blacklisted'
                            ? <span className="status-badge bg-rose-100 text-rose-700">BLACKLISTED</span>
                            : <span className="status-badge bg-emerald-50 text-emerald-700">Active</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Ledger' && (
            <div>
              <div className="flex gap-3 mb-4">
                <select className="select w-auto text-sm"><option>All Suppliers</option>{SUPPLIERS.map(s => <option key={s.id}>{s.name}</option>)}</select>
                <select className="select w-auto text-sm"><option>All Types</option><option>Invoice</option><option>Payment</option><option>Debit Note</option></select>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Supplier</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                  <tbody>
                    {LEDGER.map(l => (
                      <tr key={l.id}>
                        <td className="text-xs text-slate-500">{l.date}</td>
                        <td className="font-semibold text-slate-800">{l.supplier}</td>
                        <td><span className={`status-badge capitalize ${l.type === 'payment' ? 'bg-emerald-50 text-emerald-700' : l.type === 'debit_note' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'}`}>{l.type.replace('_', ' ')}</span></td>
                        <td><code className="text-xs text-slate-600">{l.ref}</code></td>
                        <td className="font-mono text-xs text-rose-600">{l.debit > 0 ? `AED ${l.debit.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs text-emerald-600">{l.credit > 0 ? `AED ${l.credit.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs font-bold text-slate-700">AED {l.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Payables Aging' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Outstanding AP by aging bucket. Overdue = past invoice due_date.</p>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th className="text-emerald-700">Current</th>
                      <th className="text-amber-600">1–30 days</th>
                      <th className="text-orange-600">31–60 days</th>
                      <th className="text-rose-600">60–90 days</th>
                      <th className="text-rose-800">90+ Overdue</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AGING.map((a, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-slate-800">{a.supplier}</td>
                        <td className="font-mono text-xs text-emerald-700">{a.current > 0 ? `AED ${a.current.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs text-amber-600">{a.d30 > 0 ? `AED ${a.d30.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs text-orange-600">{a.d60 > 0 ? `AED ${a.d60.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs">{a.d90 > 0 ? `AED ${a.d90.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs font-bold text-rose-700">{a.overdue > 0 ? `AED ${a.overdue.toLocaleString()}` : '—'}</td>
                        <td className="font-mono text-xs font-black text-slate-800">AED {a.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Performance' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Composite score = weighted average of delivery (40%), quality (40%), price compliance (20%).</p>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Supplier</th><th>Deliveries</th><th>On-Time %</th><th>Quality %</th><th>Price Compliance</th><th>Composite Score</th><th>Trend</th></tr></thead>
                  <tbody>
                    {PERFORMANCE.map((p, i) => (
                      <tr key={i}>
                        <td className="font-semibold text-slate-800">{p.supplier}</td>
                        <td className="text-center text-slate-600">{p.deliveries}</td>
                        <td><ScoreBar value={p.delivery} /></td>
                        <td><ScoreBar value={p.quality} /></td>
                        <td><ScoreBar value={p.price} /></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p.composite >= 85 ? 'bg-emerald-500' : p.composite >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${p.composite}%` }} />
                            </div>
                            <span className="text-sm font-black text-slate-700">{p.composite}</span>
                          </div>
                        </td>
                        <td className={`text-lg font-bold ${p.trend === '↑' ? 'text-emerald-600' : p.trend === '↓' ? 'text-rose-600' : 'text-slate-400'}`}>{p.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
