import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PlusIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function Reservations() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const { data, isLoading } = useQuery(
    ['reservations', filterStatus, filterDate],
    () => api.get('/reservations', {
      params: {
        status: filterStatus || undefined,
        start_date: filterDate || undefined,
        end_date: filterDate || undefined,
        limit: 100,
      }
    }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success(`Reservation ${status}`);
      queryClient.invalidateQueries('reservations');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const reservations = data?.reservations || [];
  const today = new Date().toISOString().split('T')[0];
  const todayCount = reservations.filter(r => r.reservation_date?.startsWith(today)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reservations</h1>
          {todayCount > 0 && <p className="text-sm text-sky-600">{todayCount} reservations today</p>}
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> New Reservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          {['pending','confirmed','cancelled','completed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input w-44" />
        {filterDate && <button onClick={() => setFilterDate('')} className="btn btn-secondary btn-sm">Clear Date</button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : reservations.length === 0 ? (
        <div className="card p-12 text-center text-slate-600">No reservations found.</div>
      ) : (
        <div className="grid gap-3">
          {reservations.map(res => {
            const isToday = res.reservation_date?.startsWith(today);
            return (
              <div key={res.id} className={`card p-4 ${isToday ? 'border-sky-500/50' : ''}`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{res.customer_name}</span>
                      {isToday && <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded">Today</span>}
                    </div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      {res.customer_phone}
                      {res.customer_email && ` · ${res.customer_email}`}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${STATUS_COLORS[res.status]}`}>{res.status}</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                    {res.reservation_date} at {res.reservation_time?.slice(0,5)}
                  </div>
                  <div>Party of {res.party_size}</div>
                  {res.table_number && <div>Table {res.table_number}</div>}
                </div>
                {res.special_requests && (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">{res.special_requests}</div>
                )}
                {res.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => updateStatus(res.id, 'confirmed')} className="btn btn-success btn-sm">Confirm</button>
                    <button onClick={() => updateStatus(res.id, 'cancelled')} className="btn btn-error btn-sm">Cancel</button>
                  </div>
                )}
                {res.status === 'confirmed' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => updateStatus(res.id, 'completed')} className="btn btn-secondary btn-sm">Mark Completed</button>
                    <button onClick={() => updateStatus(res.id, 'cancelled')} className="btn btn-error btn-sm">Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NewReservationModal
          api={api}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); queryClient.invalidateQueries('reservations'); }}
        />
      )}
    </div>
  );
}

function NewReservationModal({ api, onClose, onCreated }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    party_size: 2, reservation_date: today, reservation_time: '19:00',
    table_id: '', special_requests: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: tablesData } = useQuery('tables-all', () =>
    api.get('/tables').then(r => r.data)
  );
  const tables = tablesData?.tables || [];

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/reservations', {
        ...form,
        party_size: parseInt(form.party_size),
        table_id: form.table_id ? parseInt(form.table_id) : undefined,
      });
      toast.success('Reservation created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">New Reservation</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">Customer Name *</label><input className="input" required {...f('customer_name')} /></div>
          <div><label className="label">Phone *</label><input className="input" required {...f('customer_phone')} /></div>
          <div><label className="label">Email</label><input className="input" type="email" {...f('customer_email')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input className="input" type="date" required {...f('reservation_date')} /></div>
            <div><label className="label">Time *</label><input className="input" type="time" required {...f('reservation_time')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Party Size *</label><input className="input" type="number" min={1} max={50} required {...f('party_size')} /></div>
            <div>
              <label className="label">Table (optional)</label>
              <select className="select" {...f('table_id')}>
                <option value="">Auto-assign</option>
                {tables.map(t => <option key={t.id} value={t.id}>Table {t.table_number} (cap {t.capacity})</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Special Requests</label><textarea className="textarea h-20" {...f('special_requests')} /></div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? <LoadingSpinner size="sm" /> : 'Create Reservation'}</button>
        </form>
      </div>
    </div>
  );
}
