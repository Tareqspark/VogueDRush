import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, ClockIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-blue-500 text-white',
  preparing: 'bg-violet-500 text-white',
  ready:     'bg-yellow-400 text-slate-800',
  done:      'bg-green-500 text-white',
  cancelled: 'bg-red-500 text-white',
};

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'week' },
  { label: 'All', value: 'all' },
];

const RecentOrders = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('today');

  const buildParams = () => {
    const now = new Date();
    if (period === 'all') return 'page=1&limit=20';
    let start, end;
    if (period === 'today') {
      start = end = now.toISOString().split('T')[0];
    } else if (period === 'yesterday') {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      start = end = y.toISOString().split('T')[0];
    } else {
      const w = new Date(now); w.setDate(w.getDate() - 6);
      start = w.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    }
    return `page=1&limit=50&start_date=${start}&end_date=${end}`;
  };

  const { data: ordersData, isLoading } = useQuery(
    ['recent-orders', period],
    () => api.get(`/orders?${buildParams()}`).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const orders = ordersData?.orders || [];

  if (isLoading) return (
    <div className="card p-6 flex items-center justify-center h-48">
      <LoadingSpinner size="md" />
    </div>
  );

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <ShoppingCartIcon className="h-4 w-4 text-sky-500" />
          Recent Orders
        </h3>
        <button onClick={() => navigate('/orders')} className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline">
          View All →
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${period === p.value ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-10">
          <ClockIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No orders for this period</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-sky-50/50 border border-transparent hover:border-sky-100 transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sky-600 text-xs">{order.order_number}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[order.status] || 'bg-slate-200 text-slate-600'}`}>
                    {order.status}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{order.order_type === 'direct' ? 'takeaway' : order.order_type.replace('_', ' ')}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                  <span>{order.waiter_name || 'Unknown'}</span>
                  {order.table_number && <span>· Table {order.table_number}</span>}
                  <span>· {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="font-black text-slate-800 text-sm">৳{parseFloat(order.total_amount).toFixed(0)}</span>
                <button onClick={() => navigate('/orders')}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-sky-500 hover:bg-sky-50 transition-colors opacity-0 group-hover:opacity-100">
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
