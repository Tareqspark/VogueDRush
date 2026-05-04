import React from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, ClockIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-sky-50 text-sky-700 border-sky-200',
  ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  done:      'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
};

const RecentOrders = () => {
  const { api } = useAuth();
  const navigate = useNavigate();

  const { data: ordersData, isLoading } = useQuery(
    'recent-orders',
    () => api.get('/orders?page=1&limit=8').then(r => r.data),
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
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <ShoppingCartIcon className="h-4 w-4 text-sky-500" />
          Recent Orders
        </h3>
        <button onClick={() => navigate('/orders')} className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline">
          View All →
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-10">
          <ClockIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No recent orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-sky-50/50 border border-transparent hover:border-sky-100 transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sky-600 text-xs">{order.order_number}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                  <span className="text-xs text-slate-400 capitalize">{order.order_type === 'direct' ? 'takeway' : order.order_type.replace('_', ' ')}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
                  <span>{order.waiter_name || 'Unknown'}</span>
                  {order.table_number && <span>· Table {order.table_number}</span>}
                  <span>· {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
