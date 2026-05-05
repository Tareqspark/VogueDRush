import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  XCircleIcon, CalendarIcon, MagnifyingGlassIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeaway' };

export default function CancelledOrders() {
  const { api } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['cancelled-orders', startDate, endDate],
    () => api.get('/orders/cancelled', { params: { start_date: startDate || undefined, end_date: endDate || undefined, limit: 200 } }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const orders = (data?.orders || []).filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.waiter_full_name?.toLowerCase().includes(q) ||
      o.cancellation_reason?.toLowerCase().includes(q)
    );
  });

  const totalWasted = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <XCircleIcon className="h-6 w-6 text-rose-500" /> Cancelled Orders
          </h1>
          <p className="text-slate-500 text-sm">{orders.length} cancelled · ৳{totalWasted.toFixed(0)} total value</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <CalendarIcon className="h-4 w-4" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="input w-36 text-sm" />
          <span>—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="input w-36 text-sm" />
        </div>
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search orders…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Cancelled</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{orders.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Value</p>
          <p className="text-2xl font-black text-slate-800 mt-1">৳{totalWasted.toFixed(0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Order Value</p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            ৳{orders.length > 0 ? (totalWasted / orders.length).toFixed(0) : '0'}
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="card p-16 text-center">
          <XCircleIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No cancelled orders in this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id}
              className="card p-4 border-l-4 border-l-rose-400 bg-rose-50/10">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-slate-700 text-sm">{order.order_number}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border font-semibold">
                      {TYPE_LABELS[order.order_type] || order.order_type}
                    </span>
                    {order.table_number && (
                      <span className="text-xs text-slate-500 font-medium">Table {order.table_number}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <ClockIcon className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {order.customer_name && (
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                      {order.customer_name}{order.customer_phone ? ` · ${order.customer_phone}` : ''}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">Served by: {order.waiter_full_name}</p>
                  {order.cancellation_reason && (
                    <div className="mt-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-xs text-rose-700">
                      <span className="font-bold">Reason: </span>{order.cancellation_reason}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-800">৳{parseFloat(order.total_amount).toFixed(0)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold">Cancelled</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
