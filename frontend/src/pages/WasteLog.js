import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['Log Waste', 'History', 'Summary'];

const REASONS = ['spoilage', 'over_prep', 'dropped', 'expired', 'other'];
const REASON_STYLE = {
  spoilage:  'bg-rose-50   text-rose-700',
  over_prep: 'bg-amber-50  text-amber-700',
  dropped:   'bg-orange-50 text-orange-700',
  expired:   'bg-purple-50 text-purple-700',
  other:     'bg-slate-50  text-slate-600',
};
const REASON_LABEL = {
  spoilage: 'Spoilage', over_prep: 'Over-prep', dropped: 'Dropped', expired: 'Expired', other: 'Other',
};

// ── Log Waste Modal ───────────────────────────────────────────────────────────
function LogWasteModal({ api, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ ingredient_id: '', qty: '', reason: 'spoilage', notes: '', logged_date: today });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const { data: ingData } = useQuery(
    'waste-ingredients',
    () => api.get('/inventory').then(r => r.data)
  );
  const ingredients = ingData?.ingredients || [];
  const selectedIng = ingredients.find(i => String(i.id) === form.ingredient_id);

  const submit = async e => {
    e.preventDefault();
    if (!form.ingredient_id || parseFloat(form.qty) <= 0) return toast.error('Select ingredient and enter qty');
    setSaving(true);
    try {
      const res = await api.post('/waste', form);
      toast.success(`Waste logged — new stock: ${res.data.new_stock} ${selectedIng?.unit || ''}`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800">Log Waste</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input className="input w-full" type="date" value={form.logged_date} onChange={set('logged_date')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Ingredient *</label>
            <select className="input w-full" value={form.ingredient_id} onChange={set('ingredient_id')} required>
              <option value="">— select —</option>
              {ingredients.map(i => (
                <option key={i.id} value={i.id}>{i.name} — {i.current_stock} {i.unit} on hand</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Qty Wasted {selectedIng ? `(${selectedIng.unit})` : ''} *
            </label>
            <input className="input w-full" type="number" step="0.001" min="0.001" value={form.qty} onChange={set('qty')} required />
            {selectedIng && form.qty && (
              <p className="text-xs text-slate-400 mt-1">
                Est. cost: ৳{(parseFloat(form.qty) * parseFloat(selectedIng.cost_price || 0)).toFixed(2)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
            <select className="input w-full" value={form.reason} onChange={set('reason')}>
              {REASONS.map(r => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <input className="input w-full" value={form.notes} onChange={set('notes')} placeholder="Optional details…" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving…' : 'Log Waste'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WasteLog() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('Log Waste');
  const [showModal, setShowModal] = useState(false);
  const [dates, setDates] = useState({ from: '', to: '' });

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: historyData, isLoading: histLoading } = useQuery(
    ['waste-history', dates],
    () => api.get('/waste', {
      params: { from: dates.from || monthStart, to: dates.to || undefined }
    }).then(r => r.data),
    { enabled: activeTab === 'History', keepPreviousData: true }
  );

  const { data: summaryData, isLoading: sumLoading } = useQuery(
    ['waste-summary', dates],
    () => api.get('/waste/summary', {
      params: { from: dates.from || monthStart, to: dates.to || undefined }
    }).then(r => r.data),
    { enabled: activeTab === 'Summary' }
  );

  const logs        = historyData?.logs || [];
  const totalWaste  = historyData?.total_waste_cost || 0;
  const summary     = summaryData?.summary || [];
  const grandTotal  = summaryData?.grand_total || 0;
  const maxVal      = summary.length ? Math.max(...summary.map(s => parseFloat(s.total_cost))) : 1;

  const refresh = () => {
    qc.invalidateQueries('waste-history');
    qc.invalidateQueries('waste-summary');
    qc.invalidateQueries('ingredients');
    qc.invalidateQueries('stock-alerts');
    qc.invalidateQueries('dash-stock-alerts');
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Waste Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track spoilage, over-prep and waste · stock auto-deducted</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" /> Log Waste
        </button>
      </div>

      {/* Date filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <input type="date" className="input w-36" value={dates.from} onChange={e => setDates(p => ({ ...p, from: e.target.value }))} />
        <input type="date" className="input w-36" value={dates.to}   onChange={e => setDates(p => ({ ...p, to: e.target.value }))} />
        {(dates.from || dates.to) && (
          <button onClick={() => setDates({ from: '', to: '' })} className="btn btn-ghost btn-xs text-slate-500">Clear</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Log Waste tab ── */}
      {activeTab === 'Log Waste' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-3xl">🗑️</div>
          <p className="font-semibold text-slate-600">Record waste for the current shift</p>
          <p className="text-sm text-center max-w-sm">Waste entries immediately deduct from ingredient stock and appear in the stock ledger as waste movements.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary mt-2 flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" /> Log Waste Entry
          </button>
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'History' && (
        histLoading ? (
          <div className="text-center py-12 text-slate-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-semibold">No waste entries for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-rose-700 text-sm font-semibold">{logs.length} waste entr{logs.length !== 1 ? 'ies' : 'y'}</p>
              <p className="text-rose-700 font-black">৳{parseFloat(totalWaste).toFixed(2)} total waste cost</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Ingredient</th>
                    <th className="px-4 py-3 text-left">Reason</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Waste Cost</th>
                    <th className="px-4 py-3 text-left">Logged By</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{log.logged_date?.split('T')[0]}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{log.ingredient_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REASON_STYLE[log.reason] || 'bg-slate-50 text-slate-600'}`}>
                          {REASON_LABEL[log.reason] || log.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700">{parseFloat(log.qty).toFixed(3)} {log.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">৳{parseFloat(log.waste_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{log.logged_by_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{log.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* ── Summary tab ── */}
      {activeTab === 'Summary' && (
        sumLoading ? (
          <div className="text-center py-12 text-slate-400">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
              <p className="text-rose-700 text-sm font-semibold">Total Waste Cost (period)</p>
              <p className="text-2xl font-black text-rose-700">৳{grandTotal.toFixed(2)}</p>
            </div>
            {summary.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No waste data for this period</div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                {summary.map((s, i) => {
                  const pct = (parseFloat(s.total_cost) / maxVal) * 100;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 text-sm">{s.ingredient_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${REASON_STYLE[s.reason] || 'bg-slate-50 text-slate-600'}`}>
                            {REASON_LABEL[s.reason] || s.reason}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{parseFloat(s.total_qty).toFixed(3)} {s.unit}</span>
                          <span className="font-bold text-rose-700 text-sm">৳{parseFloat(s.total_cost).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      )}

      {showModal && (
        <LogWasteModal
          api={api}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); refresh(); }}
        />
      )}
    </div>
  );
}
