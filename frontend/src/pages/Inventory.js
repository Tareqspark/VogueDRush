import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['Ingredients', 'Stock Ledger', 'Alerts'];
const TAB_PATH = { 'Ingredients': 'ingredients', 'Stock Ledger': 'ledger', 'Alerts': 'alerts' };
const PATH_TAB = { '': 'Ingredients', 'ingredients': 'Ingredients', 'ledger': 'Stock Ledger', 'alerts': 'Alerts' };

const STATUS_STYLE = {
  ok:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  low:      'bg-amber-50  text-amber-700  border-amber-200',
  critical: 'bg-rose-50   text-rose-700   border-rose-200',
};
const MOVE_STYLE = {
  purchase:       'bg-emerald-50 text-emerald-700',
  manual_in:      'bg-teal-50    text-teal-700',
  adjustment:     'bg-sky-50     text-sky-700',
  waste:          'bg-amber-50   text-amber-700',
  transfer_in:    'bg-violet-50  text-violet-700',
  transfer_out:   'bg-orange-50  text-orange-700',
  sale_deduction: 'bg-rose-50    text-rose-700',
  opening:        'bg-slate-50   text-slate-600',
};
const MOVE_LABEL = {
  purchase: 'Purchase', manual_in: 'Stock In', adjustment: 'Adjustment',
  waste: 'Waste', transfer_in: 'Transfer In', transfer_out: 'Transfer Out',
  sale_deduction: 'Sale', opening: 'Opening',
};

function StockBar({ current, min, reorder, max }) {
  const safeMax = max > 0 ? max : Math.max(current * 2, 1);
  const pct = Math.min((current / safeMax) * 100, 100);
  const color = current <= min ? 'bg-rose-500' : current <= reorder ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-28">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[10px] text-slate-400">
        <span>{current}</span><span>{safeMax}</span>
      </div>
    </div>
  );
}

// ── Ingredient Form Modal ─────────────────────────────────────────────────────
function IngredientModal({ api, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: existing?.name || '',
    category: existing?.category || '',
    unit: existing?.unit || '',
    cost_price: existing?.cost_price || '',
    reorder_level: existing?.reorder_level || '',
    min_stock: existing?.min_stock || '',
    max_stock: existing?.max_stock || '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (existing) {
        await api.put(`/inventory/${existing.id}`, form);
        toast.success('Ingredient updated');
      } else {
        await api.post('/inventory', form);
        toast.success('Ingredient added');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800">{existing ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
              <input className="input w-full" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <input className="input w-full" value={form.category} onChange={set('category')} placeholder="e.g. Dairy" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit *</label>
              <input className="input w-full" value={form.unit} onChange={set('unit')} placeholder="kg / ltr / pcs" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cost Price</label>
              <input className="input w-full" type="number" step="0.01" value={form.cost_price} onChange={set('cost_price')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reorder Level</label>
              <input className="input w-full" type="number" step="0.001" value={form.reorder_level} onChange={set('reorder_level')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Min Stock</label>
              <input className="input w-full" type="number" step="0.001" value={form.min_stock} onChange={set('min_stock')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Stock</label>
              <input className="input w-full" type="number" step="0.001" value={form.max_stock} onChange={set('max_stock')} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stock-In / Adjust Modal ───────────────────────────────────────────────────
function StockActionModal({ api, ingredient, mode, onClose, onSaved }) {
  const [form, setForm] = useState({ qty: '', unit_cost: ingredient?.cost_price || '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = mode === 'stock-in'
        ? `/inventory/${ingredient.id}/stock-in`
        : `/inventory/${ingredient.id}/adjust`;
      const payload = mode === 'stock-in'
        ? { qty: form.qty, unit_cost: form.unit_cost, notes: form.notes }
        : { qty: form.qty, type: 'adjustment', notes: form.notes };
      await api.post(endpoint, payload);
      toast.success(mode === 'stock-in' ? 'Stock added' : 'Adjustment saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const title = mode === 'stock-in' ? 'Stock In' : 'Adjust Stock';
  const label = mode === 'stock-in' ? 'Qty to Add' : 'Delta (+ or −)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-slate-800">{title} — {ingredient?.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label} ({ingredient?.unit})</label>
            <input className="input w-full" type="number" step="0.001" value={form.qty} onChange={set('qty')} required />
          </div>
          {mode === 'stock-in' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost</label>
              <input className="input w-full" type="number" step="0.01" value={form.unit_cost} onChange={set('unit_cost')} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <input className="input w-full" value={form.notes} onChange={set('notes')} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Inventory() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { api } = useAuth();

  const seg = location.pathname.split('/inventory/')[1] || '';
  const activeTab = PATH_TAB[seg] || 'Ingredients';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState({ from: '', to: '', type: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [stockAction, setStockAction] = useState(null); // { ingredient, mode }

  // ── queries ─────────────────────────────────────────────────────────────
  const { data: ingData, isLoading: ingLoading } = useQuery(
    ['ingredients', search, categoryFilter],
    () => api.get('/inventory', { params: { search: search || undefined, category: categoryFilter || undefined } }).then(r => r.data),
    { keepPreviousData: true }
  );

  const { data: catData } = useQuery(
    'ingredient-categories',
    () => api.get('/inventory/categories').then(r => r.data)
  );

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery(
    ['stock-ledger', ledgerFilter],
    () => api.get('/inventory/ledger', { params: { from: ledgerFilter.from || undefined, to: ledgerFilter.to || undefined, type: ledgerFilter.type || undefined } }).then(r => r.data),
    { enabled: activeTab === 'Stock Ledger' }
  );

  const { data: alertData } = useQuery(
    'stock-alerts',
    () => api.get('/inventory/alerts').then(r => r.data),
    { enabled: activeTab === 'Alerts', refetchInterval: 60000 }
  );

  const deleteMutation = useMutation(
    id => api.delete(`/inventory/${id}`),
    {
      onSuccess: () => { qc.invalidateQueries('ingredients'); toast.success('Ingredient removed'); },
      onError: err => toast.error(err.response?.data?.error || 'Failed')
    }
  );

  const refresh = () => {
    qc.invalidateQueries('ingredients');
    qc.invalidateQueries('stock-ledger');
    qc.invalidateQueries('stock-alerts');
  };

  const ingredients = ingData?.ingredients || [];
  const categories = catData?.categories || [];
  const ledger = ledgerData?.ledger || [];
  const alerts = alertData?.alerts || [];

  const goTab = tab => navigate(`/inventory/${TAB_PATH[tab]}`);

  // alert badge count
  const alertCount = alerts.length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">{ingredients.length} ingredients tracked</p>
        </div>
        {activeTab === 'Ingredients' && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" /> Add Ingredient
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => goTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
              activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
            {tab === 'Alerts' && alertCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{alertCount > 9 ? '9+' : alertCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Ingredients tab ── */}
      {activeTab === 'Ingredients' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 w-full" placeholder="Search ingredients…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-40" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {ingLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : ingredients.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-semibold">No ingredients yet</p>
              <p className="text-sm mt-1">Add your first ingredient to start tracking stock.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    <th className="px-4 py-3 text-left">Stock Level</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{ing.sku}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{ing.name}</td>
                      <td className="px-4 py-3 text-slate-500">{ing.category || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{ing.unit}</td>
                      <td className="px-4 py-3 text-right text-slate-700">৳{parseFloat(ing.cost_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <StockBar current={parseFloat(ing.current_stock)} min={parseFloat(ing.min_stock)} reorder={parseFloat(ing.reorder_level)} max={parseFloat(ing.max_stock)} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[ing.stock_status]}`}>
                          {ing.stock_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setStockAction({ ingredient: ing, mode: 'stock-in' })} className="btn btn-ghost btn-xs text-emerald-600" title="Stock In">+In</button>
                          <button onClick={() => setStockAction({ ingredient: ing, mode: 'adjust' })} className="btn btn-ghost btn-xs text-sky-600" title="Adjust">Adj</button>
                          <button onClick={() => setEditItem(ing)} className="btn btn-ghost btn-icon btn-xs"><PencilIcon className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { if (window.confirm('Remove ingredient?')) deleteMutation.mutate(ing.id); }} className="btn btn-ghost btn-icon btn-xs text-rose-500"><TrashIcon className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Stock Ledger tab ── */}
      {activeTab === 'Stock Ledger' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input type="date" className="input w-36" value={ledgerFilter.from} onChange={e => setLedgerFilter(p => ({ ...p, from: e.target.value }))} />
            <input type="date" className="input w-36" value={ledgerFilter.to} onChange={e => setLedgerFilter(p => ({ ...p, to: e.target.value }))} />
            <select className="input w-40" value={ledgerFilter.type} onChange={e => setLedgerFilter(p => ({ ...p, type: e.target.value }))}>
              <option value="">All types</option>
              {Object.entries(MOVE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {ledgerLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No movements found</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Ingredient</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-left">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ledger.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{row.ingredient_name} <span className="text-slate-400 font-normal">({row.unit})</span></td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${MOVE_STYLE[row.movement_type] || 'bg-slate-50 text-slate-600'}`}>
                          {MOVE_LABEL[row.movement_type] || row.movement_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${parseFloat(row.qty) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {parseFloat(row.qty) >= 0 ? '+' : ''}{row.qty}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{row.balance_after}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.reference_type ? `${row.reference_type}#${row.reference_id}` : '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.created_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Alerts tab ── */}
      {activeTab === 'Alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-semibold text-emerald-600">All stock levels are healthy</p>
              <p className="text-sm mt-1">No ingredients below reorder level.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                  <p className="text-xs text-rose-600 font-semibold">Critical</p>
                  <p className="text-2xl font-black text-rose-700 mt-1">{alerts.filter(a => a.stock_status === 'critical').length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-xs text-amber-600 font-semibold">Low Stock</p>
                  <p className="text-2xl font-black text-amber-700 mt-1">{alerts.filter(a => a.stock_status === 'low').length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Ingredient</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Current</th>
                      <th className="px-4 py-3 text-right">Reorder At</th>
                      <th className="px-4 py-3 text-right">Min</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {alerts.map(ing => (
                      <tr key={ing.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                          <ExclamationTriangleIcon className={`h-4 w-4 ${ing.stock_status === 'critical' ? 'text-rose-500' : 'text-amber-500'}`} />
                          {ing.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{ing.category || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{ing.current_stock} {ing.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{ing.reorder_level} {ing.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{ing.min_stock} {ing.unit}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[ing.stock_status]}`}>{ing.stock_status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setStockAction({ ingredient: ing, mode: 'stock-in' })} className="btn btn-primary btn-xs">Stock In</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <IngredientModal api={api} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); refresh(); }} />
      )}
      {editItem && (
        <IngredientModal api={api} existing={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); refresh(); }} />
      )}
      {stockAction && (
        <StockActionModal api={api} ingredient={stockAction.ingredient} mode={stockAction.mode} onClose={() => setStockAction(null)} onSaved={() => { setStockAction(null); refresh(); }} />
      )}
    </div>
  );
}
