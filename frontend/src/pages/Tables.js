import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

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
              <div className="text-xs opacity-60">{table.capacity} seats</div>
            </button>
          ))}
        </div>
      )}

      {selectedTable && tableDetail && (
        <TableDetailModal table={tableDetail} onClose={() => setSelectedTable(null)} onUpdateStatus={updateStatus} userRole={user.role} />
      )}
      {showAddModal && (
        <AddTableModal api={api} onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); queryClient.invalidateQueries('tables'); }} />
      )}
    </div>
  );
}

function TableDetailModal({ table, onClose, onUpdateStatus, userRole }) {
  const order = table.current_order;
  const reservation = table.today_reservation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl border border-sky-100 animate-fade-in"
        style={{ boxShadow: '0 20px 60px rgb(2 132 199 / 0.15)' }}>
        <div className="p-6 space-y-4">
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
            <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-slate-400 text-xs font-semibold">Capacity</div>
              <div className="font-black text-slate-800 mt-0.5">{table.capacity} seats</div>
            </div>
            {table.location && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-slate-400 text-xs font-semibold">Location</div>
                <div className="font-bold text-slate-700 mt-0.5">{table.location}</div>
              </div>
            )}
          </div>

          {order && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
              <div className="text-sm font-black text-sky-700">Active Order</div>
              <div className="text-sm font-semibold text-slate-700">{order.order_number} — ৳{parseFloat(order.total_amount).toFixed(2)}</div>
              <div className="text-xs text-slate-500 capitalize">{order.status} · by {order.waiter_full_name}</div>
              {order.items && order.items.map(item => (
                <div key={item.id} className="text-xs text-slate-400">• {item.item_name} ×{item.quantity}</div>
              ))}
            </div>
          )}

          {reservation && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-sm font-black text-amber-700">Today's Reservation</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">{reservation.customer_name} @ {reservation.reservation_time}</div>
              <div className="text-xs text-slate-500">Party of {reservation.party_size}</div>
            </div>
          )}

          {userRole === 'admin' && (
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
        </div>
      </div>
    </div>
  );
}

function AddTableModal({ api, onClose, onCreated }) {
  const [form, setForm] = useState({ table_number: '', capacity: 4, location: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tables', form);
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
          <div><label className="label">Capacity *</label><input className="input" type="number" min={1} max={50} required value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))} /></div>
          <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Ground Floor" /></div>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full justify-center">{submitting ? <LoadingSpinner size="sm" /> : 'Add Table'}</button>
        </form>
      </div>
    </div>
  );
}
