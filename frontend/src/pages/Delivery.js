import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { TruckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const DELIVERY_STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  assigned: 'bg-sky-100 text-sky-600 border-blue-500/30',
  picked_up: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-rose-600 border-red-500/30',
};

const NEXT_STATUS = {
  pending: 'assigned',
  assigned: 'picked_up',
  picked_up: 'delivered',
};

const STATUS_LABELS = {
  pending: 'Pending', assigned: 'Assigned', picked_up: 'Picked Up', delivered: 'Delivered', cancelled: 'Cancelled',
};

export default function Delivery() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  const { data, isLoading } = useQuery(
    ['deliveries', filterStatus, filterDate],
    () => api.get('/delivery', {
      params: { delivery_status: filterStatus || undefined, start_date: filterDate || undefined, end_date: filterDate || undefined, limit: 100 }
    }).then(r => r.data),
    { refetchInterval: 20000 }
  );

  const { data: detail } = useQuery(
    ['delivery-detail', selectedId],
    () => api.get(`/delivery/${selectedId}`).then(r => r.data),
    { enabled: !!selectedId }
  );

  const advanceStatus = async (id, status) => {
    try {
      await api.patch(`/delivery/${id}/status`, { status });
      toast.success(`Delivery ${STATUS_LABELS[status]}`);
      queryClient.invalidateQueries('deliveries');
      queryClient.invalidateQueries(['delivery-detail', id]);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const deliveries = data?.deliveries || [];
  const counts = Object.fromEntries(
    ['pending','assigned','picked_up','delivered','cancelled'].map(s => [s, deliveries.filter(d => d.delivery_status === s).length])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TruckIcon className="h-6 w-6 text-sky-600" />
        <h1 className="text-2xl font-bold text-slate-800">Delivery Orders</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', key: 'pending', color: 'text-yellow-400' },
          { label: 'Assigned', key: 'assigned', color: 'text-sky-600' },
          { label: 'Picked Up', key: 'picked_up', color: 'text-purple-400' },
          { label: 'Delivered', key: 'delivered', color: 'text-green-400' },
        ].map(s => (
          <div key={s.key} className="card p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{counts[s.key] || 0}</div>
            <div className="text-xs text-slate-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-40">
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input w-44" />
        {filterDate && <button onClick={() => setFilterDate('')} className="btn btn-secondary btn-sm">Clear</button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : deliveries.length === 0 ? (
        <div className="card p-12 text-center text-slate-600">No delivery orders found.</div>
      ) : (
        <div className="grid gap-3">
          {deliveries.map(d => (
            <div key={d.id} className="card p-4 cursor-pointer hover:border-sky-500/50 transition-colors"
              onClick={() => setSelectedId(d.id)}>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-600">{d.order_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DELIVERY_STATUS_COLORS[d.delivery_status]}`}>
                      {STATUS_LABELS[d.delivery_status]}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-1">{d.customer_name} · {d.customer_phone}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{d.customer_address}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">৳{parseFloat(d.total_amount).toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Paid: ৳{parseFloat(d.advance_payment || 0).toFixed(2)} · Due: ৳{parseFloat(d.due_amount || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</div>
                </div>
              </div>
              {NEXT_STATUS[d.delivery_status] && (
                <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => advanceStatus(d.id, NEXT_STATUS[d.delivery_status])}
                    className="btn btn-primary btn-sm">
                    → {STATUS_LABELS[NEXT_STATUS[d.delivery_status]]}
                  </button>
                  <button onClick={() => advanceStatus(d.id, 'cancelled')} className="btn btn-error btn-sm">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedId && detail && (
        <DeliveryDetailModal
          detail={detail}
          onClose={() => setSelectedId(null)}
          onAdvance={advanceStatus}
        />
      )}
    </div>
  );
}

function DeliveryDetailModal({ detail, onClose, onAdvance }) {
  const { items } = detail;
  const next = NEXT_STATUS[detail.delivery_status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{detail.order_number}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-500" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-slate-400 text-xs">Customer</div>
            <div className="font-medium text-slate-800 mt-0.5">{detail.customer_name}</div>
            <div className="text-slate-600">{detail.customer_phone}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-slate-400 text-xs">Status</div>
            <div className={`font-medium mt-0.5 capitalize ${DELIVERY_STATUS_COLORS[detail.delivery_status]?.split(' ')[1] || ''}`}>{STATUS_LABELS[detail.delivery_status]}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 col-span-2">
            <div className="text-slate-400 text-xs">Address</div>
            <div className="text-slate-800 mt-0.5">{detail.customer_address}</div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          {items?.map(item => (
            <div key={item.id} className="flex justify-between">
              <span className="text-slate-800">{item.item_name} ×{item.quantity}</span>
              <span className="text-slate-600">৳{parseFloat(item.total_price).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 space-y-1">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Total</span><span>৳{parseFloat(detail.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Advance Paid</span><span>৳{parseFloat(detail.advance_payment || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-yellow-400 font-medium">
              <span>Due on Delivery</span><span>৳{parseFloat(detail.due_amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {next && (
          <div className="flex gap-2 pt-2">
            <button onClick={() => onAdvance(detail.id, next)} className="btn btn-primary flex-1">
              → {STATUS_LABELS[next]}
            </button>
            <button onClick={() => onAdvance(detail.id, 'cancelled')} className="btn btn-error px-4">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
