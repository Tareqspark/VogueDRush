import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const TABS = ['Dashboard', 'Ingredients', 'Recipes', 'Stock Ledger', 'Physical Count', 'Waste & Expiry', 'Alerts'];


const PATH_MAP = {
  '': 'Dashboard',
  'dashboard': 'Dashboard',
  'ingredients': 'Ingredients',
  'recipes': 'Recipes',
  'ledger': 'Stock Ledger',
  'adjustments': 'Stock Ledger',
  'physical-count': 'Physical Count',
  'waste': 'Waste & Expiry',
  'expiry': 'Waste & Expiry',
  'batches': 'Waste & Expiry',
  'alerts': 'Alerts',
  'reorder': 'Alerts',
};
const TAB_PATH = {
  'Dashboard': '',
  'Ingredients': 'ingredients',
  'Recipes': 'recipes',
  'Stock Ledger': 'ledger',
  'Physical Count': 'physical-count',
  'Waste & Expiry': 'waste',
  'Alerts': 'alerts',
};

const INGREDIENTS = [
  { id: 1, sku: 'ING-001', name: 'All-Purpose Flour', category: 'Dry Goods', unit: 'kg', current: 145.5, reorder: 75, min: 50, max: 200, cost: 25.50, status: 'ok', supplier: 'Agro Foods' },
  { id: 2, sku: 'ING-002', name: 'Olive Oil', category: 'Oils', unit: 'ltr', current: 18.2, reorder: 20, min: 15, max: 80, cost: 185.00, status: 'low', supplier: 'Mediterranean Co.' },
  { id: 3, sku: 'ING-003', name: 'Chicken Breast', category: 'Proteins', unit: 'kg', current: 32.0, reorder: 30, min: 20, max: 100, cost: 280.00, status: 'ok', supplier: 'Fresh Farm Ltd.' },
  { id: 4, sku: 'ING-004', name: 'Mozzarella Cheese', category: 'Dairy', unit: 'kg', current: 8.5, reorder: 15, min: 10, max: 50, cost: 420.00, status: 'critical', supplier: 'Dairy Direct' },
  { id: 5, sku: 'ING-005', name: 'Tomato Paste', category: 'Condiments', unit: 'kg', current: 45.0, reorder: 25, min: 20, max: 80, cost: 65.00, status: 'ok', supplier: 'Agro Foods' },
  { id: 6, sku: 'ING-006', name: 'Basmati Rice', category: 'Grains', unit: 'kg', current: 12.0, reorder: 40, min: 30, max: 150, cost: 95.00, status: 'critical', supplier: 'Grain Masters' },
  { id: 7, sku: 'ING-007', name: 'Heavy Cream', category: 'Dairy', unit: 'ltr', current: 22.5, reorder: 20, min: 15, max: 60, cost: 145.00, status: 'ok', supplier: 'Dairy Direct' },
  { id: 8, sku: 'ING-008', name: 'Garlic (Fresh)', category: 'Vegetables', unit: 'kg', current: 5.2, reorder: 8, min: 5, max: 25, cost: 55.00, status: 'low', supplier: 'Fresh Farm Ltd.' },
];

const RECIPES = [
  { id: 1, name: 'Margherita Pizza', item: 'Pizza Margherita', ingredients: 6, cost: 85.50, price: 285.00, margin: 70.0, version: 3 },
  { id: 2, name: 'Grilled Chicken', item: 'Chicken Platter', ingredients: 8, cost: 142.00, price: 380.00, margin: 62.6, version: 2 },
  { id: 3, name: 'Pasta Carbonara', item: 'Fettuccine Carbonara', ingredients: 7, cost: 95.00, price: 320.00, margin: 70.3, version: 1 },
  { id: 4, name: 'Caesar Salad Base', item: 'Caesar Salad', ingredients: 5, cost: 48.00, price: 195.00, margin: 75.4, version: 2 },
  { id: 5, name: 'Beef Burger Patty', item: 'Classic Burger', ingredients: 4, cost: 115.00, price: 340.00, margin: 66.2, version: 4 },
];

const LEDGER = [
  { id: 1, date: '2026-05-05', ingredient: 'Chicken Breast', type: 'order_deduction', qty: -2.4, balance: 32.0, ref: 'ORD-1245', by: 'System' },
  { id: 2, date: '2026-05-05', ingredient: 'Mozzarella Cheese', type: 'order_deduction', qty: -0.6, balance: 8.5, ref: 'ORD-1245', by: 'System' },
  { id: 3, date: '2026-05-04', ingredient: 'Olive Oil', type: 'purchase', qty: +12.0, balance: 20.5, ref: 'GRN-045', by: 'Admin' },
  { id: 4, date: '2026-05-04', ingredient: 'Basmati Rice', type: 'waste', qty: -3.0, balance: 15.0, ref: 'WAS-018', by: 'Chef Ali' },
  { id: 5, date: '2026-05-03', ingredient: 'All-Purpose Flour', type: 'adjustment', qty: +5.0, balance: 150.5, ref: 'ADJ-007', by: 'Manager' },
  { id: 6, date: '2026-05-03', ingredient: 'Tomato Paste', type: 'purchase', qty: +20.0, balance: 48.0, ref: 'GRN-044', by: 'Admin' },
];

const WASTE = [
  { id: 1, date: '2026-05-04', ingredient: 'Basmati Rice', qty: 3.0, reason: 'expiry', cost: 285.00, status: 'approved', by: 'Chef Ali' },
  { id: 2, date: '2026-05-03', ingredient: 'Heavy Cream', qty: 1.5, reason: 'spillage', cost: 217.50, status: 'pending', by: 'Kitchen Staff' },
  { id: 3, date: '2026-05-02', ingredient: 'Fresh Tomatoes', qty: 4.0, reason: 'quality', cost: 120.00, status: 'approved', by: 'Chef Sara' },
  { id: 4, date: '2026-05-01', ingredient: 'Chicken Breast', qty: 1.2, reason: 'damage', cost: 336.00, status: 'rejected', by: 'Chef Ali' },
];

const STATUS_STYLE = { ok: 'bg-emerald-50 text-emerald-700 border-emerald-200', low: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-rose-50 text-rose-700 border-rose-200' };
const TYPE_STYLE = { order_deduction: 'bg-rose-50 text-rose-700', purchase: 'bg-emerald-50 text-emerald-700', waste: 'bg-amber-50 text-amber-700', adjustment: 'bg-sky-50 text-sky-700' };
const TYPE_LABEL = { order_deduction: 'Sale', purchase: 'Purchase', waste: 'Waste', adjustment: 'Adjustment' };
const WASTE_STYLE = { approved: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', rejected: 'bg-rose-50 text-rose-700' };

function StockBar({ current, min, reorder, max }) {
  const pct = Math.min((current / max) * 100, 100);
  const color = current <= min ? 'bg-rose-500' : current <= reorder ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-28">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-slate-400">{current}</span>
        <span className="text-[10px] text-slate-400">{max}</span>
      </div>
    </div>
  );
}

export default function Inventory() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/inventory\/?/, '');
  const tab = PATH_MAP[subPath] || 'Dashboard';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/inventory/${TAB_PATH[t]}` : '/inventory');
  const [search, setSearch] = React.useState('');


  const filtered = INGREDIENTS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
  const totalValue = INGREDIENTS.reduce((s, i) => s + i.current * i.cost, 0);
  const lowCount = INGREDIENTS.filter(i => i.status !== 'ok').length;
  const criticalCount = INGREDIENTS.filter(i => i.status === 'critical').length;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module A · Ingredients · BOM · FIFO/WAC · Waste · Expiry · Reorder</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm"><ArrowDownTrayIcon className="h-4 w-4" /> Export</button>
          <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Ingredient</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Stock Value (WAC)', val: `AED ${(totalValue / 1000).toFixed(1)}K`, sub: 'Weighted avg cost', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
          { label: 'Total Ingredients', val: INGREDIENTS.length, sub: '2 inactive', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
          { label: 'Low / Critical', val: `${lowCount} / ${criticalCount}`, sub: 'Need reorder now', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
          { label: 'Recipes Mapped', val: RECIPES.length, sub: '38 menu items', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
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
          {/* ── DASHBOARD ── */}
          {tab === 'Dashboard' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Stock Level by Category</p>
                <div className="space-y-2.5">
                  {[
                    { cat: 'Proteins', pct: 72, val: 'AED 18,200', color: 'bg-sky-500' },
                    { cat: 'Dairy', pct: 31, val: 'AED 7,140', color: 'bg-violet-500' },
                    { cat: 'Dry Goods', pct: 85, val: 'AED 3,710', color: 'bg-emerald-500' },
                    { cat: 'Oils', pct: 23, val: 'AED 3,367', color: 'bg-amber-500' },
                    { cat: 'Grains', pct: 8, val: 'AED 1,140', color: 'bg-rose-500' },
                    { cat: 'Vegetables', pct: 21, val: 'AED 286', color: 'bg-teal-500' },
                  ].map(row => (
                    <div key={row.cat} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600 w-24 shrink-0">{row.cat}</span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full flex items-center pl-2 ${row.color}`} style={{ width: `${row.pct}%` }}>
                          <span className="text-white text-xs font-bold">{row.pct}%</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-20 text-right shrink-0">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">⚠️ Immediate Attention Required</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {INGREDIENTS.filter(i => i.status !== 'ok').map(i => (
                    <div key={i.id} className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{i.name}</p>
                        <p className="text-xs text-slate-500">{i.current} {i.unit} · reorder at {i.reorder}</p>
                      </div>
                      <span className={`status-badge border ${STATUS_STYLE[i.status]}`}>{i.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── INGREDIENTS ── */}
          {tab === 'Ingredients' && (
            <div>
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-48 max-w-xs">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9 text-sm" placeholder="SKU or name…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select w-auto text-sm"><option>All Categories</option><option>Proteins</option><option>Dairy</option><option>Dry Goods</option></select>
                <select className="select w-auto text-sm"><option>All Status</option><option>OK</option><option>Low</option><option>Critical</option></select>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>UOM</th><th>Stock Level</th><th>Cost/Unit</th><th>Supplier</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(i => (
                      <tr key={i.id}>
                        <td><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{i.sku}</code></td>
                        <td className="font-semibold text-slate-800">{i.name}</td>
                        <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{i.category}</span></td>
                        <td className="text-slate-500 text-xs">{i.unit}</td>
                        <td><StockBar current={i.current} min={i.min} reorder={i.reorder} max={i.max} /></td>
                        <td className="font-mono text-xs">AED {i.cost.toFixed(2)}</td>
                        <td className="text-slate-500 text-xs">{i.supplier}</td>
                        <td><span className={`status-badge border ${STATUS_STYLE[i.status]}`}>{i.status}</span></td>
                        <td><button className="btn btn-ghost btn-sm btn-icon"><ArrowPathIcon className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── RECIPES ── */}
          {tab === 'Recipes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-slate-500">{RECIPES.length} active recipes · Avg food cost 68.9%</p>
                <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> New Recipe</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Recipe</th><th>Menu Item</th><th>Ingredients</th><th>Food Cost</th><th>Sell Price</th><th>Margin</th><th>Version</th><th></th></tr></thead>
                  <tbody>
                    {RECIPES.map(r => (
                      <tr key={r.id}>
                        <td className="font-semibold text-slate-800">{r.name}</td>
                        <td className="text-slate-500 text-xs">{r.item}</td>
                        <td><span className="font-bold text-sky-700">{r.ingredients}</span><span className="text-slate-400 text-xs ml-1">items</span></td>
                        <td className="font-mono text-xs">AED {r.cost.toFixed(2)}</td>
                        <td className="font-mono text-xs">AED {r.price.toFixed(2)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${r.margin}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${r.margin >= 65 ? 'text-emerald-700' : 'text-amber-700'}`}>{r.margin.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td><span className="text-xs text-slate-400">v{r.version}</span></td>
                        <td><button className="btn btn-ghost btn-sm text-xs">Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── STOCK LEDGER ── */}
          {tab === 'Stock Ledger' && (
            <div>
              <div className="flex gap-3 mb-4 flex-wrap">
                <select className="select w-auto text-sm"><option>All Types</option><option>Sale</option><option>Purchase</option><option>Waste</option><option>Adjustment</option></select>
                <input type="date" className="input w-auto text-sm" defaultValue="2026-05-05" />
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Ingredient</th><th>Type</th><th>Qty Change</th><th>Balance</th><th>Reference</th><th>By</th></tr></thead>
                  <tbody>
                    {LEDGER.map(l => (
                      <tr key={l.id}>
                        <td className="text-xs text-slate-500">{l.date}</td>
                        <td className="font-semibold text-slate-800">{l.ingredient}</td>
                        <td><span className={`status-badge ${TYPE_STYLE[l.type]}`}>{TYPE_LABEL[l.type]}</span></td>
                        <td className={`font-mono text-sm font-bold ${l.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{l.qty > 0 ? `+${l.qty}` : l.qty}</td>
                        <td className="font-mono text-xs text-slate-600">{l.balance}</td>
                        <td><code className="text-xs text-sky-700">{l.ref}</code></td>
                        <td className="text-xs text-slate-500">{l.by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── WASTE & EXPIRY ── */}
          {tab === 'Waste & Expiry' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-slate-700">Waste Entries — May 2026  ·  Total loss: AED 958.50</p>
                <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Log Waste</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Ingredient</th><th>Qty</th><th>Reason</th><th>Cost Impact</th><th>Logged By</th><th>Status</th></tr></thead>
                  <tbody>
                    {WASTE.map(w => (
                      <tr key={w.id}>
                        <td className="text-xs text-slate-500">{w.date}</td>
                        <td className="font-semibold text-slate-800">{w.ingredient}</td>
                        <td className="font-mono text-xs">{w.qty} kg</td>
                        <td><span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{w.reason}</span></td>
                        <td className="font-mono text-xs font-bold text-rose-600">AED {w.cost.toFixed(2)}</td>
                        <td className="text-xs text-slate-500">{w.by}</td>
                        <td><span className={`status-badge ${WASTE_STYLE[w.status]}`}>{w.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-800 mb-3">⏰ Near-Expiry Batches (within 7 days)</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { item: 'Heavy Cream', batch: 'BATCH-041', expiry: '2026-05-08', qty: '8.5 ltr', days: 3 },
                    { item: 'Fresh Tomatoes', batch: 'BATCH-039', expiry: '2026-05-09', qty: '12.0 kg', days: 4 },
                    { item: 'Greek Yogurt', batch: 'BATCH-044', expiry: '2026-05-11', qty: '6.0 kg', days: 6 },
                  ].map(b => (
                    <div key={b.item} className="bg-white rounded-xl border border-amber-200 p-3">
                      <p className="text-sm font-bold text-slate-800">{b.item}</p>
                      <p className="text-xs text-slate-500">{b.qty} · Expires {b.expiry}</p>
                      <span className="inline-block mt-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{b.days} days left</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {tab === 'Alerts' && (
            <div className="space-y-3">
              {[
                { type: 'critical', icon: '🚨', title: 'Mozzarella Cheese critically low', body: '8.5 kg remaining — below minimum 10 kg. Auto-PO drafted for Dairy Direct.', time: '10 min ago' },
                { type: 'critical', icon: '🚨', title: 'Basmati Rice critically low', body: '12.0 kg remaining — below minimum 30 kg. Auto-PO drafted for Grain Masters.', time: '1 hr ago' },
                { type: 'low', icon: '⚠️', title: 'Olive Oil approaching reorder point', body: '18.2 ltr remaining — reorder level is 20 ltr.', time: '2 hrs ago' },
                { type: 'low', icon: '⚠️', title: 'Garlic (Fresh) approaching reorder', body: '5.2 kg remaining — reorder level is 8 kg.', time: '3 hrs ago' },
                { type: 'expiry', icon: '⏰', title: 'Heavy Cream expires in 3 days', body: 'Batch BATCH-2026-041 · 8.5 ltr in Cold Storage A.', time: '6 hrs ago' },
              ].map((a, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${a.type === 'critical' ? 'border-rose-200 bg-rose-50' : a.type === 'low' ? 'border-amber-200 bg-amber-50' : 'border-sky-200 bg-sky-50'}`}>
                  <span className="text-lg shrink-0 mt-0.5">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{a.body}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'Physical Count' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-slate-700">Count Sessions</p>
                <button className="btn btn-sm bg-sky-600 text-white hover:bg-sky-700">➕ New Count Session</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Session ID</th><th>Date</th><th>Category</th><th>Items</th><th>Status</th><th>Variance Value</th><th>Action</th></tr></thead>
                  <tbody>
                    {[
                      { id: 'PC-2026-04', date: '2026-04-01', cat: 'Full Inventory', items: 48, status: 'completed', variance: -420 },
                      { id: 'PC-2026-03', date: '2026-03-15', cat: 'Produce', items: 14, status: 'completed', variance: -85 },
                      { id: 'PC-2026-05', date: '2026-04-08', cat: 'Dairy & Protein', items: 12, status: 'in-progress', variance: null },
                      { id: 'PC-2026-06', date: '2026-04-10', cat: 'Dry Goods', items: 20, status: 'draft', variance: null },
                    ].map(s => (
                      <tr key={s.id}>
                        <td><code className="text-xs text-sky-700">{s.id}</code></td>
                        <td className="text-xs text-slate-500">{s.date}</td>
                        <td className="text-xs text-slate-600">{s.cat}</td>
                        <td className="text-xs font-bold text-slate-700">{s.items}</td>
                        <td><span className={`status-badge ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : s.status === 'in-progress' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{s.status}</span></td>
                        <td className="font-mono text-xs font-bold text-rose-600">{s.variance !== null ? `AED ${s.variance}` : '—'}</td>
                        <td><button className="btn btn-ghost btn-sm text-xs text-sky-600">{s.status === 'draft' ? 'Start' : s.status === 'in-progress' ? 'Continue' : 'View'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">Last Count Variances — PC-2026-04</p>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Ingredient</th><th>Expected</th><th>Counted</th><th>Variance Qty</th><th>Unit Cost</th><th>Variance Value</th></tr></thead>
                    <tbody>
                      {[
                        { name: 'Chicken Breast', exp: '18.0 kg', cnt: '16.5 kg', vqty: '-1.5 kg', uc: 'AED 45', vval: '-67.50', ok: false },
                        { name: 'Cherry Tomatoes', exp: '8.0 kg', cnt: '7.8 kg', vqty: '-0.2 kg', uc: 'AED 12', vval: '-2.40', ok: false },
                        { name: 'Mozzarella', exp: '6.0 kg', cnt: '5.5 kg', vqty: '-0.5 kg', uc: 'AED 95', vval: '-47.50', ok: false },
                        { name: 'Olive Oil', exp: '10.0 L', cnt: '10.0 L', vqty: '0.0 L', uc: 'AED 28', vval: 'AED 0', ok: true },
                        { name: 'Basil', exp: '2.0 kg', cnt: '1.6 kg', vqty: '-0.4 kg', uc: 'AED 35', vval: '-14.00', ok: false },
                      ].map((r, i) => (
                        <tr key={i}>
                          <td className="font-semibold text-slate-800">{r.name}</td>
                          <td className="text-xs text-slate-500">{r.exp}</td>
                          <td className="text-xs text-slate-500">{r.cnt}</td>
                          <td className={`text-xs font-bold ${r.ok ? 'text-slate-400' : 'text-rose-600'}`}>{r.vqty}</td>
                          <td className="text-xs text-slate-500">{r.uc}</td>
                          <td className={`font-mono text-xs font-bold ${r.ok ? 'text-slate-400' : 'text-rose-600'}`}>{r.vval}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
