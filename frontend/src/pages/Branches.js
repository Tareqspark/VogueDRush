import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon,
  BuildingOffice2Icon, CheckCircleIcon, XCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon,
  BookOpenIcon, ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const StatPill = ({ label, value, color = 'slate' }) => (
  <div className={`text-center px-3 py-2 rounded-xl bg-${color}-50 border border-${color}-100`}>
    <div className={`text-lg font-black text-${color}-700`}>{value}</div>
    <div className={`text-xs text-${color}-500 font-medium`}>{label}</div>
  </div>
);

export default function Branches() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hoursOpen, setHoursOpen] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [showTransfers, setShowTransfers] = useState(false);

  const { data, isLoading } = useQuery(
    'branches-admin',
    () => api.get('/branches/all/stats').then(r => r.data),
    { refetchInterval: 60000 }
  );

  const branches = data?.branches || [];

  const handleToggle = async (branch) => {
    try {
      await api.patch(`/branches/${branch.id}/toggle`);
      toast.success(`Branch ${branch.is_active ? 'deactivated' : 'activated'}`);
      queryClient.invalidateQueries('branches-admin');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/branches/${id}`);
      toast.success('Branch deleted');
      setConfirmDelete(null);
      queryClient.invalidateQueries('branches-admin');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Branch Management</h1>
          <p className="text-slate-500 text-sm">{branches.length} branch{branches.length !== 1 ? 'es' : ''} configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfers(t => !t)} className="btn btn-secondary">
            <ArrowsRightLeftIcon className="h-4 w-4" /> Transfers
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
            <PlusIcon className="h-4 w-4" /> Add Branch
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-sky-600">{branches.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Total Branches</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-emerald-600">{branches.filter(b => b.is_active).length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Active</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-sky-600">
            ৳{branches.reduce((s, b) => s + (b.stats?.today_revenue || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Today's Revenue (All)</div>
        </div>
      </div>

      {/* Branch list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : branches.length === 0 ? (
        <div className="card p-12 text-center">
          <BuildingOffice2Icon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No branches yet</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4">Add First Branch</button>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map(branch => (
            <div key={branch.id} className={`card p-5 border-l-4 ${branch.is_active ? 'border-l-emerald-400' : 'border-l-slate-300 opacity-70'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Info */}
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {branch.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-800 text-base">{branch.name}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${branch.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {branch.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    {branch.address && <p className="text-xs text-slate-500 mt-0.5">📍 {branch.address}</p>}
                    {branch.phone && <p className="text-xs text-slate-500">📞 {branch.phone}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditing(branch); setShowForm(true); }}
                    className="btn btn-secondary btn-sm"
                    title="Edit"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setHoursOpen(hoursOpen === branch.id ? null : branch.id)}
                    className="btn btn-sm bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                  >
                    <ClockIcon className="h-4 w-4" />
                    Hours
                    {hoursOpen === branch.id ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => setMenuOpen(menuOpen === branch.id ? null : branch.id)}
                    className="btn btn-sm bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
                  >
                    <BookOpenIcon className="h-4 w-4" />
                    Menu
                    {menuOpen === branch.id ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => handleToggle(branch)}
                    className={`btn btn-sm ${branch.is_active ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                    title={branch.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {branch.is_active ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                    {branch.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(branch)}
                    className="btn btn-sm bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                <StatPill label="Today Orders"   value={branch.stats?.today_orders || 0}   color="sky" />
                <StatPill label="Today Revenue"  value={`৳${(branch.stats?.today_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="emerald" />
                <StatPill label="Active Orders"  value={branch.stats?.active_orders || 0}  color="amber" />
                <StatPill label="Total Orders"   value={branch.stats?.total_orders || 0}   color="violet" />
                <StatPill label="Total Revenue"  value={`৳${(branch.stats?.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="slate" />
              </div>

              {hoursOpen === branch.id && (
                <BranchHoursPanel api={api} branchId={branch.id} />
              )}
              {menuOpen === branch.id && (
                <BranchMenuPanel api={api} branchId={branch.id} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transfers panel */}
      {showTransfers && <TransfersPanel api={api} branches={branches} />}

      {/* Create / Edit modal */}
      {showForm && (
        <BranchFormModal
          branch={editing}
          api={api}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries('branches-admin'); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-800 mb-2">Delete Branch?</h3>
            <p className="text-slate-500 text-sm mb-5">
              <span className="font-bold text-slate-700">{confirmDelete.name}</span> will be marked inactive.
              Existing orders are preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="btn flex-1 bg-rose-600 text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchMenuPanel({ api, branchId }) {
  const [items, setItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    api.get('/branches/menu/availability', { params: { branch_id: branchId } })
      .then(r => setItems(r.data.items));
  }, [branchId]); // eslint-disable-line

  const toggle = (id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_available: item.is_available ? 0 : 1 } : item));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/branches/menu/availability', {
        branch_id: branchId,
        overrides: items.map(i => ({ food_item_id: i.id, is_available: !!i.is_available }))
      });
      toast.success('Menu availability saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const filtered = items ? items.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase())) : [];
  const disabledCount = items ? items.filter(i => !i.is_available).length : 0;

  if (!items) return <div className="mt-3 flex justify-center py-4"><LoadingSpinner /></div>;

  const byCategory = filtered.reduce((acc, item) => {
    const cat = item.category_name || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Menu Availability</span>
          {disabledCount > 0 && (
            <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">{disabledCount} hidden</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="input text-xs py-1 px-2 w-36" />
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? <LoadingSpinner size="sm" /> : 'Save'}
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {Object.entries(byCategory).map(([cat, catItems]) => (
          <div key={cat}>
            <div className="px-4 py-1.5 bg-slate-50/70 text-xs font-bold text-slate-400 uppercase tracking-wide">{cat}</div>
            {catItems.map(item => (
              <label key={item.id} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                  <span className="ml-2 text-xs text-slate-400">৳{parseFloat(item.price).toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${item.is_available ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {item.is_available ? 'Available' : 'Hidden'}
                  </span>
                  <input type="checkbox" checked={!!item.is_available} onChange={() => toggle(item.id)}
                    className="h-4 w-4 accent-sky-600 rounded" />
                </div>
              </label>
            ))}
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-6 text-slate-400 text-sm">No items found</div>}
      </div>
    </div>
  );
}

function TransfersPanel({ api, branches }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ from_branch_id: '', to_branch_id: '', food_item_id: '', quantity: '', unit: 'unit', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: itemsData } = useQuery('food-items-transfer', () => api.get('/menu/items', { params: { is_available: true, limit: 200 } }).then(r => r.data));
  const { data: transfersData, isLoading } = useQuery(
    ['inventory-transfers', filterStatus],
    () => api.get('/inventory-transfers', { params: { status: filterStatus || undefined } }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const foodItems = itemsData?.items || [];
  const transfers = transfersData?.transfers || [];

  const submit = async (e) => {
    e.preventDefault();
    if (form.from_branch_id === form.to_branch_id) { toast.error('Source and destination must differ'); return; }
    setSubmitting(true);
    try {
      await api.post('/inventory-transfers', { ...form, quantity: parseFloat(form.quantity) });
      toast.success('Transfer request created');
      setForm({ from_branch_id: '', to_branch_id: '', food_item_id: '', quantity: '', unit: 'unit', notes: '' });
      queryClient.invalidateQueries('inventory-transfers');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/inventory-transfers/${id}/${action}`);
      toast.success(action === 'approve' ? 'Transfer approved' : 'Transfer rejected');
      queryClient.invalidateQueries('inventory-transfers');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const STATUS_BADGE = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-rose-50 text-rose-600 border-rose-200',
  };

  return (
    <div className="card p-5 space-y-5">
      <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><ArrowsRightLeftIcon className="h-4 w-4 text-violet-500" /> Inventory Transfers</h3>

      {/* Create form */}
      <form onSubmit={submit} className="bg-slate-50 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">New Transfer Request</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-xs">From Branch</label>
            <select className="select text-sm" required value={form.from_branch_id} onChange={e => setForm(f => ({...f, from_branch_id: e.target.value}))}>
              <option value="">Select</option>
              {branches.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">To Branch</label>
            <select className="select text-sm" required value={form.to_branch_id} onChange={e => setForm(f => ({...f, to_branch_id: e.target.value}))}>
              <option value="">Select</option>
              {branches.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="label text-xs">Item</label>
            <select className="select text-sm" required value={form.food_item_id} onChange={e => setForm(f => ({...f, food_item_id: e.target.value}))}>
              <option value="">Select item</option>
              {foodItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Qty</label>
            <input type="number" min="0.01" step="0.01" className="input text-sm" required value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} placeholder="e.g. 10" />
          </div>
        </div>
        <div>
          <label className="label text-xs">Notes (optional)</label>
          <input type="text" className="input text-sm" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Reason for transfer..." />
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
          {submitting ? <LoadingSpinner size="sm" /> : <><ArrowsRightLeftIcon className="h-4 w-4" /> Request Transfer</>}
        </button>
      </form>

      {/* Filter + list */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Transfer History</p>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select text-xs w-32">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {isLoading ? <div className="flex justify-center py-6"><LoadingSpinner /></div> :
        transfers.length === 0 ? <div className="text-center py-6 text-slate-400 text-sm">No transfers found</div> :
        <div className="space-y-2">
          {transfers.map(t => (
            <div key={t.id} className="border border-slate-100 rounded-xl p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">{t.item_name}</span>
                    <span className="text-xs text-slate-500">×{parseFloat(t.quantity)} {t.unit}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${STATUS_BADGE[t.status] || STATUS_BADGE.pending}`}>{t.status}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.from_branch_name} → {t.to_branch_name}
                    <span className="ml-2">· by {t.requested_by_name}</span>
                    {t.approved_by_name && <span className="ml-2">· approved by {t.approved_by_name}</span>}
                  </div>
                  {t.notes && <div className="text-xs text-slate-500 mt-0.5 italic">"{t.notes}"</div>}
                  <div className="text-xs text-slate-300 mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                {t.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleAction(t.id, 'approve')}
                      className="btn btn-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                      <CheckCircleIcon className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => handleAction(t.id, 'reject')}
                      className="btn btn-sm bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100">
                      <XCircleIcon className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function BranchHoursPanel({ api, branchId }) {
  const [hours, setHours] = useState(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    api.get(`/branches/${branchId}/hours`).then(r => setHours(r.data.hours));
  }, [branchId]); // eslint-disable-line

  const update = (idx, key, value) => {
    setHours(prev => prev.map((h, i) => i === idx ? { ...h, [key]: value } : h));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/branches/${branchId}/hours`, { hours });
      toast.success('Operating hours saved');
    } catch { toast.error('Failed to save hours'); }
    finally { setSaving(false); }
  };

  if (!hours) return <div className="mt-3 flex justify-center py-4"><LoadingSpinner /></div>;

  return (
    <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-black text-slate-600 uppercase tracking-wide">Operating Hours</span>
        <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
          {saving ? <LoadingSpinner size="sm" /> : 'Save Hours'}
        </button>
      </div>
      <div className="divide-y divide-slate-50">
        {hours.map((h, i) => (
          <div key={h.day_of_week} className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
            <div className="w-24 text-sm font-semibold text-slate-700">{DAY_NAMES[h.day_of_week]}</div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!h.is_open}
                onChange={e => update(i, 'is_open', e.target.checked)}
                className="h-4 w-4 accent-sky-600 rounded"
              />
              <span className="text-xs text-slate-500">{h.is_open ? 'Open' : 'Closed'}</span>
            </label>
            {h.is_open && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="time"
                  value={h.open_time?.slice(0,5) || '09:00'}
                  onChange={e => update(i, 'open_time', e.target.value)}
                  className="input py-1 px-2 text-sm w-28"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="time"
                  value={h.close_time?.slice(0,5) || '23:00'}
                  onChange={e => update(i, 'close_time', e.target.value)}
                  className="input py-1 px-2 text-sm w-28"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchFormModal({ branch, api, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:    branch?.name    || '',
    code:    branch?.code    || '',
    address: branch?.address || '',
    phone:   branch?.phone   || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSubmitting(true);
    try {
      if (branch) {
        await api.put(`/branches/${branch.id}`, form);
        toast.success('Branch updated');
      } else {
        await api.post('/branches', form);
        toast.success('Branch created');
      }
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">{branch ? 'Edit Branch' : 'Add Branch'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><XMarkIcon className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Branch Name <span className="text-rose-500">*</span></label>
            <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. FoodPark Purbachol" />
          </div>
          <div>
            <label className="label">Branch Code <span className="text-rose-500">*</span></label>
            <input
              className="input uppercase"
              required
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. PUR"
              disabled={!!branch}
              title={branch ? 'Branch code cannot be changed' : ''}
            />
            {branch && <p className="text-xs text-slate-400 mt-1">Code cannot be changed after creation.</p>}
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+880..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1 justify-center">
              {submitting ? <LoadingSpinner size="sm" /> : branch ? 'Save Changes' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
