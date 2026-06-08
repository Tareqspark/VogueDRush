import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['Expenses', 'Summary'];

const PAYMENT_MODES = ['cash', 'card', 'bkash', 'nagad', 'bank_transfer'];
const CAT_COLOR = {
  Rent:          'bg-red-100 text-red-700',
  Utilities:     'bg-sky-100 text-sky-700',
  Salary:        'bg-pink-100 text-pink-700',
  Supplies:      'bg-teal-100 text-teal-700',
  Maintenance:   'bg-amber-100 text-amber-700',
  Marketing:     'bg-violet-100 text-violet-700',
  Transport:     'bg-orange-100 text-orange-700',
  Insurance:     'bg-emerald-100 text-emerald-700',
  'Food Cost':   'bg-rose-100 text-rose-700',
  Other:         'bg-slate-100 text-slate-600',
};

function catStyle(cat) {
  return CAT_COLOR[cat] || 'bg-slate-100 text-slate-600';
}

// ── Expense Form Modal ────────────────────────────────────────────────────────
function ExpenseModal({ api, existing, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    expense_date: existing?.expense_date?.split('T')[0] || today,
    category:     existing?.category     || '',
    description:  existing?.description  || '',
    amount:       existing?.amount       || '',
    payment_mode: existing?.payment_mode || 'cash',
    reference:    existing?.reference    || '',
    notes:        existing?.notes        || '',
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const { data: catData } = useQuery(
    'expense-categories',
    () => api.get('/expenses/categories').then(r => r.data)
  );
  const categories = catData?.categories || [];

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (existing) {
        await api.put(`/expenses/${existing.id}`, form);
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense recorded');
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
          <h2 className="font-black text-slate-800">{existing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
              <input className="input w-full" type="date" value={form.expense_date} onChange={set('expense_date')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (৳) *</label>
              <input className="input w-full" type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
              <input className="input w-full" list="exp-cats" value={form.category} onChange={set('category')} required placeholder="Select or type…" />
              <datalist id="exp-cats">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
              <select className="input w-full" value={form.payment_mode} onChange={set('payment_mode')}>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description *</label>
              <input className="input w-full" value={form.description} onChange={set('description')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reference</label>
              <input className="input w-full" value={form.reference} onChange={set('reference')} placeholder="Invoice / receipt #" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <input className="input w-full" value={form.notes} onChange={set('notes')} />
            </div>
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
export default function Expenses() {
  const { api } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('Expenses');
  const [filters, setFilters] = useState({ from: '', to: '', category: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [editExp, setEditExp] = useState(null);

  // Default range: current month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: expData, isLoading } = useQuery(
    ['expenses', filters],
    () => api.get('/expenses', {
      params: {
        from:     filters.from     || monthStart,
        to:       filters.to       || undefined,
        category: filters.category || undefined,
      }
    }).then(r => r.data),
    { keepPreviousData: true }
  );

  const { data: summaryData } = useQuery(
    ['expenses-summary', filters],
    () => api.get('/expenses/summary', {
      params: {
        from: filters.from || monthStart,
        to:   filters.to   || undefined,
      }
    }).then(r => r.data),
    { enabled: activeTab === 'Summary' }
  );

  const deleteMutation = useMutation(
    id => api.delete(`/expenses/${id}`),
    {
      onSuccess: () => { qc.invalidateQueries('expenses'); qc.invalidateQueries('expenses-summary'); toast.success('Deleted'); },
      onError: err => toast.error(err.response?.data?.error || 'Failed'),
    }
  );

  const refresh = () => { qc.invalidateQueries('expenses'); qc.invalidateQueries('expenses-summary'); };

  const expenses   = expData?.expenses    || [];
  const totalAmt   = expData?.total_amount || 0;
  const summary    = summaryData?.summary  || [];
  const grandTotal = summaryData?.grand_total || 0;
  const maxCatVal  = summary.length ? Math.max(...summary.map(s => parseFloat(s.total))) : 1;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Expenses</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track operational costs · branch-scoped</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-1.5">
          <PlusIcon className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <input type="date" className="input w-36" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} placeholder="From" />
        <input type="date" className="input w-36" value={filters.to}   onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} placeholder="To" />
        <input className="input w-40" value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))} placeholder="Filter category…" />
        {(filters.from || filters.to || filters.category) && (
          <button onClick={() => setFilters({ from: '', to: '', category: '' })} className="btn btn-ghost btn-xs text-slate-500">Clear</button>
        )}
        <span className="ml-auto text-sm font-bold text-slate-700">
          Total: ৳{parseFloat(totalAmt).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
        </span>
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

      {/* ── Expenses list ── */}
      {activeTab === 'Expenses' && (
        isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading…</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-semibold">No expenses recorded</p>
            <p className="text-sm mt-1">Add your first expense to start tracking costs.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Ref</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{exp.expense_date?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catStyle(exp.category)}`}>{exp.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">{exp.description}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{exp.payment_mode?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">৳{parseFloat(exp.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-sky-600">{exp.reference || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditExp(exp)} className="btn btn-ghost btn-icon btn-xs"><PencilIcon className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (window.confirm('Delete this expense?')) deleteMutation.mutate(exp.id); }} className="btn btn-ghost btn-icon btn-xs text-rose-500"><TrashIcon className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">{expenses.length} entries</td>
                  <td className="px-4 py-3 text-right font-black text-slate-800">৳{parseFloat(totalAmt).toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {/* ── Summary tab ── */}
      {activeTab === 'Summary' && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
            <p className="text-slate-500 text-sm">Total Expenses (period)</p>
            <p className="text-2xl font-black text-slate-800">৳{grandTotal.toFixed(2)}</p>
          </div>

          {summary.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No data for this period</div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
              {summary.map(s => {
                const pct = (parseFloat(s.total) / maxCatVal) * 100;
                const share = grandTotal > 0 ? (parseFloat(s.total) / grandTotal * 100).toFixed(1) : '0';
                return (
                  <div key={s.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catStyle(s.category)}`}>{s.category}</span>
                        <span className="text-xs text-slate-400">{s.count} entr{s.count === 1 ? 'y' : 'ies'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{share}%</span>
                        <span className="font-bold text-slate-800 text-sm">৳{parseFloat(s.total).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <ExpenseModal api={api} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh(); }} />
      )}
      {editExp && (
        <ExpenseModal api={api} existing={editExp} onClose={() => setEditExp(null)} onSaved={() => { setEditExp(null); refresh(); }} />
      )}
    </div>
  );
}
