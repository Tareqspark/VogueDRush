import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['Purchase Orders', 'Goods Receiving'];
const STATUS_STYLE = {
  draft:     'bg-slate-100 text-slate-600',
  confirmed: 'bg-sky-50   text-sky-700',
  partial:   'bg-amber-50 text-amber-700',
  received:  'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50  text-rose-600',
};

// ── PO Create Modal ───────────────────────────────────────────────────────────
function POModal({ api, onClose, onSaved }) {
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '' });
  const [lines, setLines] = useState([{ ingredient_id: '', qty: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  const { data: suppData } = useQuery('po-suppliers', () => api.get('/suppliers').then(r => r.data));
  const { data: ingData }  = useQuery('po-ingredients', () => api.get('/inventory').then(r => r.data));
  const suppliers    = suppData?.suppliers || [];
  const ingredients  = ingData?.ingredients || [];

  const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines(ls => [...ls, { ingredient_id: '', qty: 1, unit_price: 0 }]);
  const removeLine = i => setLines(ls => ls.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.unit_price) || 0), 0);

  const submit = async e => {
    e.preventDefault();
    if (!form.supplier_id) return toast.error('Select a supplier');
    const validLines = lines.filter(l => l.ingredient_id && parseFloat(l.qty) > 0);
    if (!validLines.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await api.post('/purchase-orders', { ...form, lines: validLines });
      toast.success('Purchase order created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800">New Purchase Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier *</label>
              <select className="input w-full" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))} required>
                <option value="">— select —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expected Date</label>
              <input className="input w-full" type="date" value={form.expected_date} onChange={e => setForm(p => ({ ...p, expected_date: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <input className="input w-full" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</p>
              <button type="button" onClick={addLine} className="btn btn-ghost btn-xs flex items-center gap-1"><PlusIcon className="h-3.5 w-3.5" /> Add Row</button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_110px_32px] gap-2 items-center">
                  <select className="input" value={line.ingredient_id} onChange={e => setLine(i, 'ingredient_id', e.target.value)}>
                    <option value="">— ingredient —</option>
                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.sku})</option>)}
                  </select>
                  <input className="input text-right" type="number" min="0.001" step="any" placeholder="Qty" value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
                  <input className="input text-right" type="number" min="0" step="0.01" placeholder="Unit Price" value={line.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)} />
                  <button type="button" onClick={() => removeLine(i)} className="btn btn-ghost btn-icon btn-xs text-rose-400"><XMarkIcon className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <p className="text-right mt-2 text-sm font-bold text-slate-700">Total: ৳{total.toFixed(2)}</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Creating…' : 'Create PO'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PO Detail / Receive Modal ─────────────────────────────────────────────────
function PODetailModal({ api, poId, onClose, onAction }) {
  const { data, isLoading } = useQuery(
    ['po-detail', poId],
    () => api.get(`/purchase-orders/${poId}`).then(r => r.data),
    { enabled: !!poId }
  );
  const [acting, setActing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receiveForm, setReceiveForm] = useState({});
  const [grnNotes, setGrnNotes] = useState('');

  const po    = data?.po;
  const items = data?.items || [];

  const act = async action => {
    setActing(true);
    try {
      await api.put(`/purchase-orders/${poId}/${action}`);
      toast.success(action === 'confirm' ? 'PO Confirmed' : 'PO Cancelled');
      onAction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setActing(false); }
  };

  const initReceive = () => {
    const init = {};
    items.forEach(item => {
      const remaining = parseFloat(item.qty_ordered) - parseFloat(item.qty_received || 0);
      init[item.id] = { qty_received: remaining > 0 ? remaining : 0, unit_cost: item.unit_price };
    });
    setReceiveForm(init);
    setReceiving(true);
  };

  const submitReceive = async () => {
    setActing(true);
    try {
      const receiveLines = Object.entries(receiveForm)
        .filter(([, v]) => parseFloat(v.qty_received) > 0)
        .map(([item_id, v]) => ({ item_id: parseInt(item_id), qty_received: parseFloat(v.qty_received), unit_cost: parseFloat(v.unit_cost) }));
      if (!receiveLines.length) { toast.error('Enter at least one received qty'); setActing(false); return; }
      await api.post(`/purchase-orders/${poId}/receive`, { lines: receiveLines, notes: grnNotes });
      toast.success('GRN created — stock updated');
      onAction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setActing(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading…</div>
        ) : !po ? (
          <div className="text-center py-12 text-slate-400">Not found</div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-slate-800">{po.po_number}</h2>
                <p className="text-sm text-slate-500">{po.supplier_name} · {new Date(po.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[po.status]}`}>{po.status}</span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
            </div>

            <table className="w-full text-sm mb-4">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2 text-right">Received</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  {receiving && <th className="px-3 py-2 text-right">Receive Now</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(item => {
                  const remaining = parseFloat(item.qty_ordered) - parseFloat(item.qty_received || 0);
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-medium text-slate-700">{item.ingredient_name}</td>
                      <td className="px-3 py-2 text-right">{item.qty_ordered} {item.unit}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{item.qty_received || 0}</td>
                      <td className="px-3 py-2 text-right">৳{parseFloat(item.unit_price).toFixed(2)}</td>
                      {receiving && (
                        <td className="px-3 py-2 text-right">
                          <input
                            className="input w-24 text-right"
                            type="number" min="0" max={remaining} step="any"
                            value={receiveForm[item.id]?.qty_received ?? remaining}
                            onChange={e => setReceiveForm(p => ({ ...p, [item.id]: { ...p[item.id], qty_received: e.target.value } }))}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Total: <span className="font-bold text-slate-800">৳{parseFloat(po.total_amount).toFixed(2)}</span></p>
            </div>

            {receiving && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">GRN Notes</label>
                <input className="input w-full" value={grnNotes} onChange={e => setGrnNotes(e.target.value)} placeholder="Optional notes…" />
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button onClick={onClose} className="btn btn-ghost">Close</button>
              {po.status === 'draft' && (
                <>
                  <button onClick={() => act('confirm')} disabled={acting} className="btn btn-primary">Confirm</button>
                  <button onClick={() => act('cancel')} disabled={acting} className="btn btn-ghost text-rose-500">Cancel PO</button>
                </>
              )}
              {(po.status === 'confirmed' || po.status === 'partial') && !receiving && (
                <button onClick={initReceive} className="btn btn-primary">Receive Stock</button>
              )}
              {receiving && (
                <button onClick={submitReceive} disabled={acting} className="btn btn-primary">{acting ? 'Saving…' : 'Confirm Receipt'}</button>
              )}
              {po.status === 'confirmed' && !receiving && (
                <button onClick={() => act('cancel')} disabled={acting} className="btn btn-ghost text-rose-500">Cancel PO</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Standalone GRN Modal ──────────────────────────────────────────────────────
function StandaloneGRNModal({ api, onClose, onSaved }) {
  const [form, setForm] = useState({ supplier_id: '', invoice_number: '', notes: '' });
  const [lines, setLines] = useState([{ ingredient_id: '', qty_received: 1, unit_cost: 0 }]);
  const [saving, setSaving] = useState(false);

  const { data: suppData } = useQuery('po-suppliers', () => api.get('/suppliers').then(r => r.data));
  const { data: ingData }  = useQuery('po-ingredients', () => api.get('/inventory').then(r => r.data));
  const suppliers    = suppData?.suppliers || [];
  const ingredients  = ingData?.ingredients || [];

  const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));

  const submit = async e => {
    e.preventDefault();
    const validLines = lines.filter(l => l.ingredient_id && parseFloat(l.qty_received) > 0);
    if (!validLines.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await api.post('/purchase-orders/grn/standalone', { ...form, lines: validLines });
      toast.success('Direct receipt recorded');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800">Direct Receipt (No PO)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier</label>
              <select className="input w-full" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">— optional —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
              <input className="input w-full" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <input className="input w-full" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</p>
              <button type="button" onClick={() => setLines(ls => [...ls, { ingredient_id: '', qty_received: 1, unit_cost: 0 }])} className="btn btn-ghost btn-xs flex items-center gap-1"><PlusIcon className="h-3.5 w-3.5" /> Add Row</button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_110px_32px] gap-2 items-center mb-2">
                <select className="input" value={line.ingredient_id} onChange={e => setLine(i, 'ingredient_id', e.target.value)}>
                  <option value="">— ingredient —</option>
                  {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.sku})</option>)}
                </select>
                <input className="input text-right" type="number" min="0.001" step="any" placeholder="Qty" value={line.qty_received} onChange={e => setLine(i, 'qty_received', e.target.value)} />
                <input className="input text-right" type="number" min="0" step="0.01" placeholder="Unit Cost" value={line.unit_cost} onChange={e => setLine(i, 'unit_cost', e.target.value)} />
                <button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="btn btn-ghost btn-icon btn-xs text-rose-400"><XMarkIcon className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving…' : 'Record Receipt'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── GRN Detail Modal ──────────────────────────────────────────────────────────
function GRNDetailModal({ api, grnId, onClose }) {
  const { data, isLoading } = useQuery(
    ['grn-detail', grnId],
    () => api.get(`/purchase-orders/grn/${grnId}`).then(r => r.data),
    { enabled: !!grnId }
  );
  const grn   = data?.grn;
  const items = data?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {isLoading ? <div className="text-center py-12 text-slate-400">Loading…</div> : !grn ? <div className="text-center py-12 text-slate-400">Not found</div> : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-black text-slate-800">{grn.grn_number}</h2>
                <p className="text-sm text-slate-500">{grn.supplier_name || 'Direct'} · {new Date(grn.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <table className="w-full text-sm mb-4">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Cost</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-slate-700">{item.ingredient_name}</td>
                    <td className="px-3 py-2 text-right">{item.qty_received} {item.unit}</td>
                    <td className="px-3 py-2 text-right">৳{parseFloat(item.unit_cost).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold">৳{(parseFloat(item.qty_received) * parseFloat(item.unit_cost)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{grn.notes || ''}</span>
              <span className="font-black text-slate-800">Total: ৳{parseFloat(grn.total_cost || 0).toFixed(2)}</span>
            </div>
            <button onClick={onClose} className="btn btn-ghost w-full mt-4">Close</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PurchasePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { api } = useAuth();

  const seg = location.pathname.split('/purchase')[1]?.replace('/', '') || '';
  const activeTab = seg === 'grn' ? 'Goods Receiving' : 'Purchase Orders';

  const [showNewPO, setShowNewPO] = useState(false);
  const [showStandaloneGRN, setShowStandaloneGRN] = useState(false);
  const [viewPO, setViewPO] = useState(null);
  const [viewGRN, setViewGRN] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [grnDates, setGrnDates] = useState({ from: '', to: '' });

  const { data: poData, isLoading: poLoading } = useQuery(
    ['purchase-orders', statusFilter],
    () => api.get('/purchase-orders', { params: { status: statusFilter || undefined } }).then(r => r.data),
    { keepPreviousData: true, enabled: activeTab === 'Purchase Orders' }
  );

  const { data: grnData, isLoading: grnLoading } = useQuery(
    ['grns', grnDates],
    () => api.get('/purchase-orders/grn/list', { params: { from: grnDates.from || undefined, to: grnDates.to || undefined } }).then(r => r.data),
    { keepPreviousData: true, enabled: activeTab === 'Goods Receiving' }
  );

  const pos  = poData?.orders || [];
  const grns = grnData?.grns  || [];

  const filteredPOs = search
    ? pos.filter(p => p.po_number.includes(search) || (p.supplier_name || '').toLowerCase().includes(search.toLowerCase()))
    : pos;

  const refresh = () => {
    qc.invalidateQueries('purchase-orders');
    qc.invalidateQueries('grns');
    qc.invalidateQueries('po-ingredients');
  };

  const goTab = tab => navigate(tab === 'Purchase Orders' ? '/purchase' : '/purchase/grn');

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Procurement</h1>
          <p className="text-slate-500 text-sm mt-0.5">Purchase orders and goods receiving</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'Purchase Orders' && (
            <button onClick={() => setShowNewPO(true)} className="btn btn-primary flex items-center gap-1.5">
              <PlusIcon className="h-4 w-4" /> New PO
            </button>
          )}
          {activeTab === 'Goods Receiving' && (
            <button onClick={() => setShowStandaloneGRN(true)} className="btn btn-ghost flex items-center gap-1.5">
              <PlusIcon className="h-4 w-4" /> Direct Receipt
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => goTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Purchase Orders tab ── */}
      {activeTab === 'Purchase Orders' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative w-64">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 w-full" placeholder="PO number / supplier…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {['draft','confirmed','partial','received','cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {poLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : filteredPOs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-semibold">No purchase orders</p>
              <p className="text-sm mt-1">Create your first PO to start procurement.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">PO Number</th>
                    <th className="px-4 py-3 text-left">Supplier</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Expected</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPOs.map(po => (
                    <tr key={po.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">{po.po_number}</td>
                      <td className="px-4 py-3 text-slate-600">{po.supplier_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(po.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">৳{parseFloat(po.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[po.status]}`}>{po.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setViewPO(po.id)} className="btn btn-ghost btn-icon btn-xs"><EyeIcon className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Goods Receiving tab ── */}
      {activeTab === 'Goods Receiving' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <input type="date" className="input w-36" value={grnDates.from} onChange={e => setGrnDates(p => ({ ...p, from: e.target.value }))} />
            <input type="date" className="input w-36" value={grnDates.to} onChange={e => setGrnDates(p => ({ ...p, to: e.target.value }))} />
          </div>

          {grnLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : grns.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-semibold">No goods received yet</p>
              <p className="text-sm mt-1">Receive stock against a PO or add a direct receipt.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">GRN Number</th>
                    <th className="px-4 py-3 text-left">PO Reference</th>
                    <th className="px-4 py-3 text-left">Supplier</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {grns.map(grn => (
                    <tr key={grn.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">{grn.grn_number}</td>
                      <td className="px-4 py-3 text-slate-500">{grn.po_number || <span className="italic text-slate-400">Direct</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{grn.supplier_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(grn.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">৳{parseFloat(grn.total_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setViewGRN(grn.id)} className="btn btn-ghost btn-icon btn-xs"><EyeIcon className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showNewPO && <POModal api={api} onClose={() => setShowNewPO(false)} onSaved={() => { setShowNewPO(false); refresh(); }} />}
      {showStandaloneGRN && <StandaloneGRNModal api={api} onClose={() => setShowStandaloneGRN(false)} onSaved={() => { setShowStandaloneGRN(false); refresh(); }} />}
      {viewPO && <PODetailModal api={api} poId={viewPO} onClose={() => setViewPO(null)} onAction={() => { setViewPO(null); refresh(); }} />}
      {viewGRN && <GRNDetailModal api={api} grnId={viewGRN} onClose={() => setViewGRN(null)} />}
    </div>
  );
}
