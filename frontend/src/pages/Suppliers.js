import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const TABS = ['Suppliers', 'Ledger'];
const TAB_PATH = { 'Suppliers': '', 'Ledger': 'ledger' };
const PATH_TAB = { '': 'Suppliers', 'suppliers': 'Suppliers', 'ledger': 'Ledger' };

const PAYMENT_TERMS = ['COD', 'NET-7', 'NET-15', 'NET-30', 'NET-45', 'NET-60'];

const LEDGER_STYLE = {
  invoice:     'bg-rose-50   text-rose-700',
  payment:     'bg-emerald-50 text-emerald-700',
  debit_note:  'bg-amber-50  text-amber-700',
  credit_note: 'bg-sky-50    text-sky-700',
};

// ── Supplier Form Modal ────────────────────────────────────────────────────────
function SupplierModal({ api, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:           existing?.name           || '',
    contact_person: existing?.contact_person || '',
    phone:          existing?.phone          || '',
    email:          existing?.email          || '',
    address:        existing?.address        || '',
    category:       existing?.category       || '',
    payment_terms:  existing?.payment_terms  || 'NET-30',
    lead_days:      existing?.lead_days      || 3,
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (existing) {
        await api.put(`/suppliers/${existing.id}`, form);
        toast.success('Supplier updated');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier added');
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
          <h2 className="font-black text-slate-800">{existing ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier Name *</label>
              <input className="input w-full" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Person</label>
              <input className="input w-full" value={form.contact_person} onChange={set('contact_person')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <input className="input w-full" value={form.category} onChange={set('category')} placeholder="e.g. Dairy" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input className="input w-full" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input className="input w-full" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Terms</label>
              <select className="input w-full" value={form.payment_terms} onChange={set('payment_terms')}>
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Days</label>
              <input className="input w-full" type="number" min="0" value={form.lead_days} onChange={set('lead_days')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
              <textarea className="input w-full" rows={2} value={form.address} onChange={set('address')} />
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

// ── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ api, supplier, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/suppliers/${supplier.id}/payment`, form);
      toast.success('Payment recorded');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-slate-800">Record Payment — {supplier.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Outstanding: <span className="font-bold text-rose-600">৳{parseFloat(supplier.balance).toFixed(2)}</span></p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
            <input className="input w-full" type="number" step="0.01" value={form.amount} onChange={set('amount')} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
            <input className="input w-full" type="date" value={form.date} onChange={set('date')} />
          </div>
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
export default function SuppliersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { api } = useAuth();

  const seg = location.pathname.split('/suppliers')[1]?.replace('/', '') || '';
  const activeTab = PATH_TAB[seg] || 'Suppliers';

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [paymentSupplier, setPaymentSupplier] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [ledgerDates, setLedgerDates] = useState({ from: '', to: '' });

  const { data: supData, isLoading } = useQuery(
    ['suppliers', search],
    () => api.get('/suppliers', { params: { search: search || undefined } }).then(r => r.data),
    { keepPreviousData: true }
  );

  const { data: ledgerData, isLoading: ledgerLoading } = useQuery(
    ['supplier-ledger', selectedSupplierId, ledgerDates],
    () => api.get(`/suppliers/${selectedSupplierId}/ledger`, { params: { from: ledgerDates.from || undefined, to: ledgerDates.to || undefined } }).then(r => r.data),
    { enabled: activeTab === 'Ledger' && !!selectedSupplierId }
  );

  const deleteMutation = useMutation(
    id => api.delete(`/suppliers/${id}`),
    {
      onSuccess: () => { qc.invalidateQueries('suppliers'); toast.success('Supplier removed'); },
      onError: err => toast.error(err.response?.data?.error || 'Failed')
    }
  );

  const refresh = () => { qc.invalidateQueries('suppliers'); qc.invalidateQueries('supplier-ledger'); };
  const suppliers = supData?.suppliers || [];
  const ledger = ledgerData?.ledger || [];
  const ledgerSupplier = ledgerData?.supplier;

  const totalBalance = suppliers.reduce((s, sup) => s + parseFloat(sup.balance || 0), 0);

  const goTab = tab => navigate(tab === 'Suppliers' ? '/suppliers' : '/suppliers/ledger');

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} active suppliers · Total payable ৳{totalBalance.toFixed(2)}</p>
        </div>
        {activeTab === 'Suppliers' && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-1.5">
            <PlusIcon className="h-4 w-4" /> Add Supplier
          </button>
        )}
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

      {/* ── Suppliers list ── */}
      {activeTab === 'Suppliers' && (
        <div className="space-y-3">
          <div className="relative w-72">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 w-full" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-semibold">No suppliers yet</p>
              <p className="text-sm mt-1">Add your first supplier to start procurement.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Terms</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {suppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{sup.name}</td>
                      <td className="px-4 py-3 text-slate-500">{sup.category || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        <div>{sup.contact_person || '—'}</div>
                        {sup.phone && <div className="text-xs text-slate-400">{sup.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">{sup.payment_terms}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${parseFloat(sup.balance) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>৳{parseFloat(sup.balance).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {parseFloat(sup.balance) > 0 && (
                            <button onClick={() => setPaymentSupplier(sup)} className="btn btn-ghost btn-xs text-emerald-600">Pay</button>
                          )}
                          <button onClick={() => { setSelectedSupplierId(String(sup.id)); goTab('Ledger'); }} className="btn btn-ghost btn-xs">Ledger</button>
                          <button onClick={() => setEditSupplier(sup)} className="btn btn-ghost btn-icon btn-xs"><PencilIcon className="h-3.5 w-3.5" /></button>
                          <button onClick={() => { if (window.confirm('Remove supplier?')) deleteMutation.mutate(sup.id); }} className="btn btn-ghost btn-icon btn-xs text-rose-500"><TrashIcon className="h-3.5 w-3.5" /></button>
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

      {/* ── Supplier Ledger tab ── */}
      {activeTab === 'Ledger' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <select className="input w-56" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" className="input w-36" value={ledgerDates.from} onChange={e => setLedgerDates(p => ({ ...p, from: e.target.value }))} />
            <input type="date" className="input w-36" value={ledgerDates.to} onChange={e => setLedgerDates(p => ({ ...p, to: e.target.value }))} />
          </div>

          {!selectedSupplierId ? (
            <div className="text-center py-16 text-slate-400">Select a supplier to view their ledger</div>
          ) : ledgerLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : (
            <>
              {ledgerSupplier && (
                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">{ledgerSupplier.name}</p>
                    <p className="text-xs text-slate-500">{ledgerSupplier.payment_terms} · Lead {ledgerSupplier.lead_days}d</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Outstanding Balance</p>
                    <p className={`text-xl font-black ${parseFloat(ledgerSupplier.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>৳{parseFloat(ledgerSupplier.balance).toFixed(2)}</p>
                  </div>
                </div>
              )}
              {ledger.length === 0 ? (
                <div className="text-center py-12 text-slate-400">No transactions found</div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Reference</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {ledger.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500 text-xs">{new Date(row.transaction_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${LEDGER_STYLE[row.transaction_type] || 'bg-slate-50 text-slate-600'}`}>
                              {row.transaction_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{row.reference_type ? `${row.reference_type}#${row.reference_id}` : '—'}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.transaction_type === 'payment' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.transaction_type === 'payment' ? '−' : '+'}৳{parseFloat(row.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">৳{parseFloat(row.running_balance).toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{row.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && <SupplierModal api={api} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); refresh(); }} />}
      {editSupplier && <SupplierModal api={api} existing={editSupplier} onClose={() => setEditSupplier(null)} onSaved={() => { setEditSupplier(null); refresh(); }} />}
      {paymentSupplier && <PaymentModal api={api} supplier={paymentSupplier} onClose={() => setPaymentSupplier(null)} onSaved={() => { setPaymentSupplier(null); refresh(); }} />}
    </div>
  );
}
