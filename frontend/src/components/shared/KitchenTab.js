import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { ClockIcon, CheckIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const ORDER_BORDER = { queued: 'border-l-amber-400', preparing: 'border-l-sky-500', ready: 'border-l-emerald-500', cancelled: 'border-l-slate-300' };
const ITEM_BADGE   = { queued: 'bg-amber-50 text-amber-600 border-amber-200', preparing: 'bg-sky-50 text-sky-600 border-sky-200', ready: 'bg-emerald-50 text-emerald-600 border-emerald-200', cancelled: 'bg-slate-50 text-slate-400 border-slate-200' };

function orderStatus(items) {
  const active = items.filter(i => i.status !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  if (active.every(i => i.status === 'ready')) return 'ready';
  if (active.some(i => i.status === 'preparing')) return 'preparing';
  return 'queued';
}

export default function KitchenTab() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');

  const { data, isLoading } = useQuery(
    ['shared-kitchen-tab', filterStatus],
    () => api.get('/kitchen', { params: { status: filterStatus || undefined, limit: 200 } }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const startItem = async (id) => {
    try {
      await api.patch(`/kitchen/${id}/start`);
      toast.success('Started preparing');
      queryClient.invalidateQueries('shared-kitchen-tab');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const completeItem = async (id) => {
    try {
      await api.patch(`/kitchen/${id}/ready`);
      toast.success('Item ready!');
      queryClient.invalidateQueries('shared-kitchen-tab');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const completeOrder = async (order) => {
    try {
      const activeItems = order.items.filter(i => i.status !== 'cancelled' && i.status !== 'ready');
      if (activeItems.length === 0) { toast('All items already ready'); return; }
      await Promise.all(activeItems.map(item => api.patch(`/kitchen/${item.id}/ready`)));
      toast.success(`Order ${order.order_number} ready!`);
      queryClient.invalidateQueries('shared-kitchen-tab');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const queue = data?.queue || [];
  const ordersMap = new Map();
  queue.forEach(item => {
    if (!ordersMap.has(item.order_id)) {
      ordersMap.set(item.order_id, { order_id: item.order_id, order_number: item.order_number, table_number: item.table_number, order_type: item.order_type, waiter_full_name: item.waiter_full_name, items: [] });
    }
    ordersMap.get(item.order_id).items.push(item);
  });

  let orders = Array.from(ordersMap.values());
  if (filterStatus) {
    orders = orders.filter(o => {
      const st = orderStatus(o.items);
      return st === filterStatus;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-400 font-semibold">{orders.length} order{orders.length !== 1 ? 's' : ''} in queue</p>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          <option value="queued">Queued</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center text-slate-400 text-sm">Kitchen queue is empty</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const st = orderStatus(order.items);
            const activeItems = order.items.filter(i => i.status !== 'cancelled');
            const allReady = activeItems.every(i => i.status === 'ready');
            return (
              <div key={order.order_id} className={`bg-white border border-slate-100 rounded-2xl border-l-4 ${ORDER_BORDER[st]} shadow-card`}>
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                      {order.table_number && (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Table {order.table_number}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">by {order.waiter_full_name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!allReady ? (
                      <button onClick={() => completeOrder(order)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                        <CheckIcon className="h-3.5 w-3.5" /> Order Ready
                      </button>
                    ) : (
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full">✅ All Ready</span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {activeItems.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-2 pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{item.item_name}</span>
                          <span className="text-xs font-black text-slate-500">×{item.quantity}</span>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full border capitalize ${ITEM_BADGE[item.status]}`}>{item.status}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="flex items-center gap-0.5"><ClockIcon className="h-3 w-3" /> {item.estimated_prep_time}m</span>
                        </div>
                        {item.special_instructions && (
                          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 mt-1">📝 {item.special_instructions}</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {item.status === 'queued' && (
                          <button onClick={() => startItem(item.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100">
                            <BoltIcon className="h-3 w-3" /> Start
                          </button>
                        )}
                        {item.status === 'preparing' && (
                          <button onClick={() => completeItem(item.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                            <CheckIcon className="h-3 w-3" /> Ready
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
