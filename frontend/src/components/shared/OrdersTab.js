import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { ClockIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  done:      'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  hold:      'bg-orange-50 text-orange-600 border-orange-200',
};
const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeaway' };
const TYPE_BORDER = {
  dine_in:  'border-l-sky-400',
  delivery: 'border-l-amber-400',
  direct:   'border-l-emerald-400',
};

export default function OrdersTab() {
  const { api, selectedBranch } = useAuth();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['shared-orders-tab', filterStatus, filterType, selectedBranch?.id],
    () => api.get('/orders', {
      params: { status: filterStatus || undefined, order_type: filterType || undefined, limit: 100, branch_id: selectedBranch?.id }
    }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const orders = (data?.orders || []).filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.table_number?.toString().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.waiter_full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search order / table / customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input text-sm flex-1 min-w-40"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          {['pending','preparing','ready','done','cancelled','hold'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
          <option value="">All Types</option>
          <option value="dine_in">Dine In</option>
          <option value="delivery">Delivery</option>
          <option value="direct">Takeaway</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">No orders found</div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-semibold">{orders.length} orders</p>
          {orders.map(order => (
            <div key={order.id}
              className={`card p-4 border-l-4 ${order.status === 'hold' ? 'border-l-orange-400 bg-orange-50/20' : (TYPE_BORDER[order.order_type] || 'border-l-slate-200')}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                    {TYPE_LABELS[order.order_type]}
                  </span>
                  {order.table_number && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                      Table {order.table_number}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <ClockIcon className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                    {order.status === 'hold' ? '⏸ Hold' : order.status}
                  </span>
                  <span className="font-black text-slate-800">৳{parseFloat(order.total_amount || 0).toFixed(0)}</span>
                  {order.bill_printed && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      <LockClosedIcon className="h-3 w-3" /> Printed
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>by {order.waiter_full_name}</span>
                {order.customer_name && <span className="text-slate-500">{order.customer_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
