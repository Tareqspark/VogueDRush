import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { ClockIcon, FireIcon, CheckIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const PRIORITY_COLORS = { 0: 'text-slate-400 bg-slate-100', 1: 'text-amber-600 bg-amber-50 border border-amber-200', 2: 'text-rose-600 bg-rose-50 border border-rose-200' };
const PRIORITY_LABELS = { 0: 'Normal', 1: 'High', 2: 'Urgent' };

// Derive overall order status from its items
function orderStatus(items) {
  const active = items.filter(i => i.status !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  if (active.every(i => i.status === 'ready')) return 'ready';
  if (active.some(i => i.status === 'preparing')) return 'preparing';
  return 'queued';
}

const ORDER_BORDER = { queued: 'border-l-amber-400', preparing: 'border-l-sky-500', ready: 'border-l-emerald-500', cancelled: 'border-l-slate-300' };
const ITEM_STATUS_BADGE = {
  queued:    'bg-amber-50 text-amber-600 border border-amber-200',
  preparing: 'bg-sky-50 text-sky-600 border border-sky-200',
  ready:     'bg-emerald-50 text-emerald-600 border border-emerald-200',
  cancelled: 'bg-slate-50 text-slate-400 border border-slate-200',
};
export default function Kitchen() {
  const { api } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join-kitchen');
    socket.on('kitchen-update', () => queryClient.invalidateQueries('kitchen'));
    socket.on('order-status-update', () => queryClient.invalidateQueries('kitchen'));
    return () => {
      socket.off('kitchen-update');
      socket.off('order-status-update');
    };
  }, [socket, queryClient]);

  const { data, isLoading, refetch } = useQuery(
    ['kitchen', filterStatus],
    () => api.get('/kitchen', { params: { status: filterStatus || undefined, limit: 200 } }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const startItem = async (id) => {
    try {
      await api.patch(`/kitchen/${id}/start`);
      toast.success('Started preparing');
      queryClient.invalidateQueries('kitchen');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const completeItem = async (id) => {
    try {
      await api.patch(`/kitchen/${id}/ready`);
      toast.success('Item ready!');
      queryClient.invalidateQueries('kitchen');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const queue = data?.queue || [];

  // Group items by order_id
  const ordersMap = new Map();
  queue.forEach(item => {
    if (!ordersMap.has(item.order_id)) {
      ordersMap.set(item.order_id, {
        order_id: item.order_id,
        order_number: item.order_number,
        table_number: item.table_number,
        order_type: item.order_type,
        customer_name: item.customer_name,
        waiter_full_name: item.waiter_full_name,
        items: [],
      });
    }
    ordersMap.get(item.order_id).items.push(item);
  });

  let orders = Array.from(ordersMap.values());

  // Filter by status if selected
  if (filterStatus) {
    orders = orders.filter(o => {
      const st = orderStatus(o.items);
      if (filterStatus === 'queued') return st === 'queued';
      if (filterStatus === 'preparing') return st === 'preparing';
      if (filterStatus === 'ready') return st === 'ready';
      return true;
    });
  }

  const countByStatus = (s) => Array.from(ordersMap.values()).filter(o => orderStatus(o.items) === s).length;

  const getElapsed = (item) => {
    if (!item.started_at) return null;
    return Math.floor((now - new Date(item.started_at)) / 60000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-sm">
            <FireIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Kitchen Display</h1>
            <p className="text-slate-400 text-xs">{orders.length} order{orders.length !== 1 ? 's' : ''} in queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
            <option value="">All Status</option>
            <option value="queued">Queued</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
          </select>
          <button onClick={() => refetch()} className="btn btn-secondary">Refresh</button>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Queued',    count: countByStatus('queued'),    bg: 'from-amber-50 to-amber-100/50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '⏳' },
          { label: 'Preparing', count: countByStatus('preparing'), bg: 'from-sky-50 to-sky-100/50',       text: 'text-sky-700',     border: 'border-sky-200',     icon: '👨‍🍳' },
          { label: 'Ready',     count: countByStatus('ready'),     bg: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✅' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center bg-gradient-to-br ${s.bg} ${s.border}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-3xl font-black ${s.text}`}>{s.count}</div>
            <div className={`text-xs font-semibold mt-0.5 ${s.text}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="card p-16 text-center">
          <FireIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Kitchen queue is empty</p>
          <p className="text-slate-300 text-sm mt-1">New orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map(order => {
            const st = orderStatus(order.items);
            const maxPriority = Math.max(...order.items.map(i => i.priority || 0));
            const activeItems = order.items.filter(i => i.status !== 'cancelled');
            const allReady = activeItems.every(i => i.status === 'ready');

            return (
              <div key={order.order_id}
                className={`bg-white border border-slate-100 rounded-2xl border-l-4 ${ORDER_BORDER[st]} shadow-card hover:shadow-card-hover transition-all`}>

                {/* Order header */}
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                      {order.table_number && (
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Table {order.table_number}
                        </span>
                      )}
                      {order.order_type === 'delivery' && (
                        <span className="text-xs font-semibold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-200">Delivery</span>
                      )}
                      {order.order_type === 'direct' && (
                        <span className="text-xs font-semibold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200">Direct</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-1">by {order.waiter_full_name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {maxPriority > 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[maxPriority]}`}>
                        {PRIORITY_LABELS[maxPriority]}
                      </span>
                    )}
                    {allReady && (
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full">✅ All Ready</span>
                    )}
                  </div>
                </div>

                {/* Items list */}
                <div className="p-4 space-y-2.5">
                  {activeItems.map(item => {
                    const elapsed = getElapsed(item);
                    const overdue = elapsed !== null && elapsed > item.estimated_prep_time;
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        {/* Item details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm">{item.item_name}</span>
                            <span className="text-xs font-black text-slate-500">×{item.quantity}</span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full capitalize ${ITEM_STATUS_BADGE[item.status]}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                            <span className="flex items-center gap-0.5"><ClockIcon className="h-3 w-3" /> {item.estimated_prep_time}m est.</span>
                            {item.status === 'queued' && item.time_in_queue > 0 && (
                              <span className="text-amber-500">waiting {item.time_in_queue}m</span>
                            )}
                            {item.status === 'preparing' && elapsed !== null && (
                              <span className={overdue ? 'text-rose-500 font-bold' : 'text-sky-500'}>
                                {elapsed}m elapsed{overdue ? ' ⚠' : ''}
                              </span>
                            )}
                          </div>
                          {item.special_instructions && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1">
                              📝 {item.special_instructions}
                            </div>
                          )}
                        </div>

                        {/* Per-item action */}
                        <div className="shrink-0">
                          {item.status === 'queued' && (
                            <button onClick={() => startItem(item.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap">
                              <BoltIcon className="h-3 w-3" /> Start
                            </button>
                          )}
                          {item.status === 'preparing' && (
                            <button onClick={() => completeItem(item.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                              <CheckIcon className="h-3 w-3" /> Ready
                            </button>
                          )}
                          {item.status === 'ready' && (
                            <span className="text-xs font-bold text-emerald-600">✓ Done</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
