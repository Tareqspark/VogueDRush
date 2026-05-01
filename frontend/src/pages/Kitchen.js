import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { ClockIcon, FireIcon, CheckIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const PRIORITY_LABELS = { 0: 'Normal', 1: 'High', 2: 'Urgent' };
const PRIORITY_COLORS = { 0: 'text-slate-400 bg-slate-100', 1: 'text-amber-600 bg-amber-50', 2: 'text-rose-600 bg-rose-50' };
const STATUS_COLORS = {
  queued:    'border-l-amber-400',
  preparing: 'border-l-sky-500',
  ready:     'border-l-emerald-500',
  cancelled: 'border-l-slate-300',
};
const STATUS_BADGES = {
  queued:    'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-sky-50 text-sky-700 border-sky-200',
  ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function Kitchen() {
  const { api } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [now, setNow] = useState(Date.now());

  // Tick every 30s to keep timers fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Socket real-time updates
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
  const byStatus = {
    queued: queue.filter(i => i.status === 'queued'),
    preparing: queue.filter(i => i.status === 'preparing'),
    ready: queue.filter(i => i.status === 'ready'),
  };

  const getElapsed = (item) => {
    if (!item.started_at) return null;
    const mins = Math.floor((now - new Date(item.started_at)) / 60000);
    return mins;
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
            <p className="text-slate-400 text-xs">{queue.length} item{queue.length !== 1 ? 's' : ''} in queue</p>
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
          { label: 'Queued', count: byStatus.queued.length, bg: 'from-amber-50 to-amber-100/50', text: 'text-amber-700', border: 'border-amber-200', icon: '⏳' },
          { label: 'Preparing', count: byStatus.preparing.length, bg: 'from-sky-50 to-sky-100/50', text: 'text-sky-700', border: 'border-sky-200', icon: '👨‍🍳' },
          { label: 'Ready', count: byStatus.ready.length, bg: 'from-emerald-50 to-emerald-100/50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✅' },
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
      ) : queue.length === 0 ? (
        <div className="card p-16 text-center">
          <FireIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Kitchen queue is empty</p>
          <p className="text-slate-300 text-sm mt-1">New orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {queue.map(item => (
            <div key={item.id}
              className={`bg-white border border-slate-100 rounded-2xl p-4 border-l-4 ${STATUS_COLORS[item.status] || ''} shadow-card hover:shadow-card-hover transition-all space-y-3`}>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sky-600 text-sm">{item.order_number}</span>
                  {item.table_number && (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Table {item.table_number}
                    </span>
                  )}
                  {item.order_type === 'delivery' && (
                    <span className="text-xs font-semibold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-200">Delivery</span>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority]}`}>
                  {PRIORITY_LABELS[item.priority]}
                </span>
              </div>

              {/* Item info */}
              <div>
                <div className="text-base font-black text-slate-800">{item.item_name}</div>
                <div className="text-sm text-slate-500 font-medium mt-0.5">Qty: {item.quantity}</div>
                {item.special_instructions && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 font-medium">
                    📝 {item.special_instructions}
                  </div>
                )}
              </div>

              {/* Timing */}
              <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  <span>Est. {item.estimated_prep_time}m</span>
                </div>
                {item.status === 'queued' && (
                  <span className="text-amber-500">Waiting {item.time_in_queue}m</span>
                )}
                {item.status === 'preparing' && getElapsed(item) !== null && (
                  <span className={getElapsed(item) > item.estimated_prep_time ? 'text-rose-500 font-bold' : 'text-sky-500'}>
                    {getElapsed(item)}m elapsed
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-300 font-medium">by {item.waiter_full_name}</div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {item.status === 'queued' && (
                  <button onClick={() => startItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                    <BoltIcon className="h-3.5 w-3.5" /> Start Preparing
                  </button>
                )}
                {item.status === 'preparing' && (
                  <button onClick={() => completeItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    <CheckIcon className="h-3.5 w-3.5" /> Mark Ready
                  </button>
                )}
                {item.status === 'ready' && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300">
                    ✅ Ready to Serve
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
