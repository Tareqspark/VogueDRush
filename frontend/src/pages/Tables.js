import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import TabNavigation from '../components/Layout/TabNavigation';
import ReceiptsTab from '../components/shared/ReceiptsTab';
import TransactionsTab from '../components/shared/TransactionsTab';
import OrdersTab from '../components/shared/OrdersTab';
import KitchenTab from '../components/shared/KitchenTab';

const STATUS_STYLES = {
  available: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  occupied:  'border-rose-300 bg-rose-50 text-rose-700',
  reserved:  'border-amber-300 bg-amber-50 text-amber-700',
};
const STATUS_BADGES = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  occupied:  'bg-rose-50 text-rose-700 border-rose-200',
  reserved:  'bg-amber-50 text-amber-700 border-amber-200',
};


export default function Tables() {
  const { api, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [tab, setTab] = useState('overview');

  const { data, isLoading } = useQuery(
    ['tables', filterStatus, filterLocation],
    () => api.get('/tables', { params: { status: filterStatus || undefined, location: filterLocation || undefined } }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const { data: tableDetail } = useQuery(
    ['table-detail', selectedTable],
    () => api.get(`/tables/${selectedTable}`).then(r => r.data),
    { enabled: !!selectedTable }
  );

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/tables/${id}/status`, { status });
      toast.success(`Table status updated to ${status}`);
      queryClient.invalidateQueries('tables');
      queryClient.invalidateQueries(['table-detail', id]);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update');
    }
  };

  const handleEdit = async (id, data) => {
    try {
      await api.put(`/tables/${id}`, data);
      toast.success('Table updated');
      queryClient.invalidateQueries('tables');
      queryClient.invalidateQueries(['table-detail', id]);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update table');
      throw e;
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/tables/${id}`);
      toast.success('Table deleted');
      setSelectedTable(null);
      queryClient.invalidateQueries('tables');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Cannot delete — table may have active orders');
    }
  };

  const tables = data?.tables || [];
  const locations = [...new Set(tables.map(t => t.location).filter(Boolean))];

  const counts = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Tables</h1>
          <p className="text-slate-400 text-sm">{tables.length} tables total</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <PlusIcon className="h-4 w-4" /> Add Table
          </button>
        )}
      </div>

      <TabNavigation activeTab={tab} setActiveTab={setTab} userRole={user?.role} />

      {tab === 'overview' && (
        <>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Available', count: counts.available, bg: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🟢' },
          { label: 'Occupied',  count: counts.occupied,  bg: 'from-rose-50 to-rose-100/50',     text: 'text-rose-700',    border: 'border-rose-200',    icon: '🔴' },
          { label: 'Reserved',  count: counts.reserved,  bg: 'from-amber-50 to-amber-100/50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '🟡' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center bg-gradient-to-br ${s.bg} ${s.border}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-black ${s.text}`}>{s.count}</div>
            <div className={`text-xs font-semibold mt-0.5 ${s.text}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="reserved">Reserved</option>
        </select>
        <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="select w-44">
          <option value="">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map(table => (
            <button key={table.id} onClick={() => setSelectedTable(table.id)}
              className={`rounded-2xl p-5 text-center border-2 hover:scale-105 hover:shadow-card-hover transition-all cursor-pointer ${STATUS_STYLES[table.status]}`}>
              <div className="text-2xl font-black mb-1">{table.table_number}</div>
              <div className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full border inline-block ${STATUS_BADGES[table.status]}`}>{table.status}</div>
              <div className="text-xs mt-2 opacity-60 font-medium">{table.location}</div>
            </button>
          ))}
        </div>
      )}

      {selectedTable && tableDetail && (
        <TableDetailModal
          table={tableDetail}
          onClose={() => setSelectedTable(null)}
          onUpdateStatus={updateStatus}
          onEdit={handleEdit}
          onDelete={handleDelete}
          userRole={user.role}
        />
      )}
        </>
      )}

      {tab === 'orders' && <OrdersTab />}
      {tab === 'kitchen' && <KitchenTab />}
      {tab === 'receipts' && <ReceiptsTab />}
      {tab === 'transactions' && <TransactionsTab />}

      {selectedTable && tableDetail && (
        <TableDetailModal
          table={tableDetail}
          onClose={() => setSelectedTable(null)}
          onUpdateStatus={updateStatus}
          onEdit={handleEdit}
          onDelete={handleDelete}
          userRole={user.role}
        />
      )}
      {showAddModal && (
        <AddTableModal api={api} onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); queryClient.invalidateQueries('tables'); }} />
      )}
    </div>
  );
}

function TableDetailModal({ table, onClose, onUpdateStatus, onEdit, onDelete, userRole }) {
  const order = table.current_order;
  const reservation = table.today_reservation;
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ table_number: table.table_number, location: table.location || '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveEdit = async () => {
    if (!form.table_number.trim()) return toast.error('Table number is required');
    setSaving(true);
    try {
      await onEdit(table.id, { table_number: form.table_number.trim(), location: form.location.trim() });
      setEditMode(false);
    } catch {
      // error already toasted in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl border border-sky-100 animate-fade-in"
        style={{ boxShadow: '0 20px 60px rgb(2 132 199 / 0.15)' }}>
        <div className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black border-2 ${STATUS_STYLES[table.status]}`}>
                {table.table_number}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Table {table.table_number}</h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGES[table.status]}`}>{table.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {userRole === 'admin' && !editMode && (
                <button onClick={() => setEditMode(true)} title="Edit table"
                  className="btn btn-ghost btn-icon text-violet-500 hover:bg-violet-50">
                  <PencilSquareIcon className="h-4.5 w-4.5" style={{ height: '1.1rem', width: '1.1rem' }} />
                </button>
              )}
              <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
            </div>
          </div>

          {/* Inline edit form */}
          {editMode ? (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black text-violet-600 uppercase tracking-wider">Edit Table</p>
              <div>
                <label className="label">Table Number *</label>
                <input
                  className="input"
                  value={form.table_number}
                  onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))}
                  placeholder="e.g. T9"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  className="input"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. First Floor"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditMode(false); setForm({ table_number: table.table_number, location: table.location || '' }); }}
                  className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="btn btn-primary flex-1 justify-center">
                  {saving ? <LoadingSpinner size="sm" /> : <><CheckIcon className="h-4 w-4" />Save</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-slate-400 text-xs font-semibold">Table No.</div>
                <div className="font-bold text-slate-700 mt-0.5">{table.table_number}</div>
              </div>
              {table.location && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-slate-400 text-xs font-semibold">Location</div>
                  <div className="font-bold text-slate-700 mt-0.5">{table.location}</div>
                </div>
              )}
            </div>
          )}

          {/* Active order */}
          {order && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
              <div className="text-sm font-black text-sky-700">Active Order</div>
              <div className="text-sm font-semibold text-slate-700">{order.order_number} — ৳{parseFloat(order.total_amount).toFixed(2)}</div>
              <div className="text-xs text-slate-500 capitalize">{order.status} · by {order.waiter_full_name}</div>
            </div>
          )}

          {/* Reservation */}
          {reservation && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm font-black text-amber-700">Today's Reservation</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">{reservation.customer_name} @ {reservation.reservation_time}</div>
              <div className="text-xs text-slate-500">Party of {reservation.party_size}</div>
            </div>
          )}

          {/* Status buttons */}
          {userRole === 'admin' && !editMode && (
            <div className="flex gap-2 pt-1">
              {table.status !== 'available' && (
                <button onClick={() => onUpdateStatus(table.id, 'available')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">Set Available</button>
              )}
              {table.status !== 'occupied' && (
                <button onClick={() => onUpdateStatus(table.id, 'occupied')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors">Set Occupied</button>
              )}
              {table.status !== 'reserved' && (
                <button onClick={() => onUpdateStatus(table.id, 'reserved')} className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">Set Reserved</button>
              )}
            </div>
          )}

          {/* Delete — admin only, not when occupied */}
          {userRole === 'admin' && !editMode && (
            confirmDelete ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
                <p className="text-sm font-bold text-rose-700">Delete Table {table.table_number}?</p>
                <p className="text-xs text-rose-500">This cannot be undone. Only possible if no orders reference this table.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary flex-1 text-xs">Cancel</button>
                  <button onClick={() => onDelete(table.id)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors">Yes, Delete</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-rose-500 border border-rose-200 hover:bg-rose-50 transition-colors">
                <TrashIcon className="h-3.5 w-3.5" /> Delete Table
              </button>
            )
          )}

        </div>
      </div>
    </div>
  );
}

function AddTableModal({ api, onClose, onCreated }) {
  const [form, setForm] = useState({ table_number: '', location: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tables', { ...form, capacity: 4 });
      toast.success('Table added');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-sky-100 p-6"
        style={{ boxShadow: '0 20px 60px rgb(2 132 199 / 0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-slate-800">Add Table</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Table Number *</label><input className="input" required value={form.table_number} onChange={e => setForm(f => ({...f, table_number: e.target.value}))} placeholder="e.g. T9" /></div>
          <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Ground Floor" /></div>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full justify-center">{submitting ? <LoadingSpinner size="sm" /> : 'Add Table'}</button>
        </form>
      </div>
    </div>
  );
}
