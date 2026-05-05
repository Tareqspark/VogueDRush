import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
  FireIcon,
  TruckIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import StatCard from '../components/Dashboard/StatCard';
import RecentOrders from '../components/Dashboard/RecentOrders';
import KitchenStatus from '../components/Dashboard/KitchenStatus';
import TableStatus from '../components/Dashboard/TableStatus';
import TodayReservations from '../components/Dashboard/TodayReservations';

const Dashboard = () => {
  const { user, api } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [selectedPeriod] = useState('today');
  const [tab, setTab] = useState('overview');
  const [drill, setDrill] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: viewingOrderDetail } = useQuery(
    ['dash-order-detail', viewingOrder],
    () => api.get(`/orders/${viewingOrder}`).then(r => r.data),
    { enabled: !!viewingOrder }
  );

  // Fetch dashboard statistics
  const {
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery(
    ['dashboard-stats', selectedPeriod],
    async () => {
      const response = await api.get('/orders/stats/overview');
      return response.data;
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Fetch order statistics
  const {
    data: orderStats,
    isLoading: orderStatsLoading,
  } = useQuery(
    'order-stats',
    async () => {
      const response = await api.get('/orders/stats/overview');
      return response.data;
    },
    {
      refetchInterval: 30000,
    }
  );

  // Fetch table statistics
  const {
    data: tableStats,
    isLoading: tableStatsLoading,
  } = useQuery(
    'table-stats',
    async () => {
      const response = await api.get('/tables/stats/overview');
      return response.data;
    },
    {
      refetchInterval: 30000,
    }
  );

  // Fetch kitchen statistics
  const {
    data: kitchenStats,
    isLoading: kitchenStatsLoading,
  } = useQuery(
    'kitchen-stats',
    async () => {
      const response = await api.get('/kitchen', { params: { limit: 200 } });
      const payload = response.data || {};
      const stats = payload.stats || {};

      return {
        currentWorkload: {
          queued_items: parseInt(stats.queued || 0, 10),
          preparing_items: parseInt(stats.preparing || 0, 10),
          ready_items: parseInt(stats.ready || 0, 10),
          total_queued_time: parseFloat(stats.avg_completion_time || 0),
        },
        performanceStats: {
          completion_rate: parseInt(stats.total_items || 0, 10) > 0
            ? Math.round((parseInt(stats.ready || 0, 10) * 100) / parseInt(stats.total_items || 1, 10))
            : 0,
          efficiency_percentage: parseInt(stats.overdue || 0, 10) > 0 ? 70 : 90,
          avg_prep_time: parseFloat(stats.avg_completion_time || 0),
        }
      };
    },
    {
      refetchInterval: 30000,
    }
  );

  // Fetch today's reservations
  const {
    data: todayReservations,
    isLoading: reservationsLoading,
  } = useQuery(
    'today-reservations',
    async () => {
      const response = await api.get('/reservations/today/list');
      return response.data;
    },
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  const { data: menuPerfData } = useQuery(
    ['dash-menu-performance'],
    async () => {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const response = await api.get('/reports/menu-performance', { params: { start_date: start, end_date: end, limit: 8 } });
      return response.data;
    },
    { refetchInterval: 60000 }
  );

  const { data: drillOrders } = useQuery(
    ['dash-drill-orders', drill],
    async () => {
      const params = { limit: 20 };
      if (drill?.kind === 'status') params.status = drill.value;
      if (drill?.kind === 'type') params.order_type = drill.value;
      const response = await api.get('/orders', { params });
      return response.data;
    },
    { enabled: !!drill }
  );

  const { data: receiptData } = useQuery(
    ['dash-receipts', user?.role],
    async () => {
      const response = await api.get('/orders/receipts/history', { params: { limit: 50 } });
      return response.data;
    },
    { enabled: user?.role === 'admin', refetchInterval: 60000 }
  );

  const { data: transactionData } = useQuery(
    ['dash-transactions', user?.role],
    async () => {
      const response = await api.get('/orders/transactions/report', { params: { limit: 50 } });
      return response.data;
    },
    { enabled: user?.role === 'admin', refetchInterval: 60000 }
  );

  // Listen for real-time updates
  useEffect(() => {
    // Socket event listeners would be set up here
    // This is a placeholder for real-time updates

    return () => {
      // Cleanup
    };
  }, [refetchStats]);

  if (statsLoading || orderStatsLoading || tableStatsLoading || kitchenStatsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Prepare dashboard data (M-12: compute real trends from yesterdayStats)
  const todayStats = orderStats?.todayStats || {};
  const yesterdayStats = orderStats?.yesterdayStats || {};
  const statusStats = orderStats?.statusStats || [];
  const typeStats = orderStats?.typeStats || [];
  
  // Compute real trend percentages
  const todayRevenue = parseFloat(todayStats.today_revenue || 0);
  const yesterdayRevenue = parseFloat(yesterdayStats.yesterday_revenue || 0);
  const revenueTrend = yesterdayRevenue > 0 
    ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 * 10) / 10 
    : null;
    
  const todayOrders = parseInt(todayStats.today_orders || 0);
  const yesterdayOrders = parseInt(yesterdayStats.yesterday_orders || 0);
  const ordersTrend = yesterdayOrders > 0
    ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 * 10) / 10
    : null;
  
  const tableOccupancy = tableStats?.todayOccupancy || {};
  const kitchenWorkload = kitchenStats?.currentWorkload || {};
  const soldByName = (menuPerfData?.item_performance || []).slice(0, 7).map(item => ({
    name: item.item_name,
    sold: parseInt(item.total_quantity || 0, 10),
    revenue: Math.round(parseFloat(item.total_revenue || 0)),
    orders: parseInt(item.orders_count || 0, 10),
    category: item.category_name || '',
    cancelledCount: parseInt(item.cancelled_count || 0, 10),
  }));
  const soldByCategory = (menuPerfData?.category_performance || []).slice(0, 7).map(cat => ({
    name: cat.category_name,
    sold: parseInt(cat.total_quantity || 0, 10),
  }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Welcome banner ── */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 60%, #38BDF8 100%)' }}>
        <div className="absolute right-4 top-0 bottom-0 flex items-center opacity-10 text-9xl font-black select-none">
          📊
        </div>
        <div className="relative z-10">
          <p className="text-sky-200 text-sm font-medium">{greeting},</p>
          <h1 className="text-2xl font-black mt-0.5">{user?.full_name} 👋</h1>
          <p className="text-sky-100 text-sm mt-1">Here's what's happening at Vogue D Rush today.</p>
        </div>
        <div className={`absolute top-4 right-16 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
          isConnected ? 'bg-white/20 text-white' : 'bg-rose-500/50 text-white'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-rose-200'}`} />
          {isConnected ? 'Live Updates' : 'Offline'}
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`৳${(todayStats.today_revenue || 0).toLocaleString()}`}
          icon={CurrencyDollarIcon}
          trend={revenueTrend}
          trendLabel="vs yesterday"
          color="sky"
        />
        <StatCard
          title="Today's Orders"
          value={todayStats.today_orders || 0}
          icon={ShoppingCartIcon}
          trend={ordersTrend}
          trendLabel="vs yesterday"
          color="lemon"
        />
        <StatCard
          title="Active Tables"
          value={tableOccupancy.occupied_tables || 0}
          icon={RectangleGroupIcon}
          subtitle={`of ${tableOccupancy.total_tables || 0} total`}
          color="rose"
        />
        <StatCard
          title="Kitchen Queue"
          value={kitchenWorkload.queued_items || 0}
          icon={FireIcon}
          subtitle={`${kitchenWorkload.preparing_items || 0} preparing`}
          color="emerald"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('overview')} className={`btn btn-sm ${tab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}>Overview</button>
        {user?.role === 'admin' && <button onClick={() => setTab('receipts')} className={`btn btn-sm ${tab === 'receipts' ? 'btn-primary' : 'btn-secondary'}`}>Receipt Tab</button>}
        {user?.role === 'admin' && <button onClick={() => setTab('transactions')} className={`btn btn-sm ${tab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}>Transaction Report</button>}
      </div>

      {tab === 'overview' && (
        <>
      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RecentOrders />
        </div>
        <div className="space-y-5">
          <TableStatus stats={tableStats} />
          <KitchenStatus stats={kitchenStats} />
          {(user?.role === 'admin' || user?.role === 'waiter') && (
            <TodayReservations
              reservations={todayReservations?.reservations || []}
              isLoading={reservationsLoading}
            />
          )}
        </div>
      </div>

      {/* ── Distribution cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-sky-500 inline-block" />
            Order Status Distribution
          </h3>
          <div className="space-y-3">
            {statusStats.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No data yet</p>
            ) : statusStats.map((s) => (
              <button key={s.status} onClick={() => setDrill({ kind: 'status', value: s.status })}
                className="w-full text-left flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className={`status-badge status-${s.status}`}>{s.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">{s.count}</span>
                  <span className="text-xs text-slate-400">৳{(s.total_revenue || 0).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-amber-500 inline-block" />
            Order Type Distribution
          </h3>
          <div className="space-y-3">
            {typeStats.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No data yet</p>
            ) : typeStats.map((t) => (
              <button key={t.order_type} onClick={() => setDrill({ kind: 'type', value: t.order_type })}
                className="w-full text-left flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors">
                <div className="flex items-center gap-2.5">
                  {t.order_type === 'dine_in' && <RectangleGroupIcon className="h-4 w-4 text-sky-500" />}
                  {t.order_type === 'delivery' && <TruckIcon className="h-4 w-4 text-amber-500" />}
                  {t.order_type === 'direct' && <UsersIcon className="h-4 w-4 text-emerald-500" />}
                  <span className="text-sm text-slate-600 capitalize">{t.order_type === 'direct' ? 'takeway' : t.order_type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">{t.count}</span>
                  <span className="text-xs text-slate-400">৳{(t.total_revenue || 0).toLocaleString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {drill && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-800">Drill View: {drill.kind} = {drill.value}</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setDrill(null)}>Close</button>
          </div>
          <div className="space-y-2">
            {(drillOrders?.orders || []).map((o) => (
              <button key={o.id} onClick={() => setViewingOrder(o.id)} className="w-full text-left rounded-lg border border-slate-100 p-3 hover:bg-sky-50 hover:border-sky-200 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700">{o.order_number}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-500 capitalize">{o.order_type === 'direct' ? 'Takeway' : o.order_type}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold">View</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Status: <span className="capitalize font-medium">{o.status}</span> · ৳{parseFloat(o.total_amount || 0).toFixed(0)} {o.cancellation_reason ? `| ${o.cancellation_reason}` : ''}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Items Sold By Name</h3>
          <p className="text-xs text-slate-400 mb-3">Click a bar to see item details</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={soldByName} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
              onClick={(e) => { if (e?.activePayload?.[0]) setSelectedItem(e.activePayload[0].payload); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar yAxisId="left" dataKey="sold" name="Qty Sold" stackId="a" fill="#0284C7" radius={[0,0,0,0]} cursor="pointer" />
              <Bar yAxisId="left" dataKey="orders" name="Orders" stackId="a" fill="#38BDF8" radius={[4,4,0,0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Items Sold By Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={soldByCategory} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="sold" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </>
      )}

      {tab === 'receipts' && user?.role === 'admin' && (
        <div className="card p-6">
          <h3 className="text-sm font-black text-slate-800 mb-4">Receipt History</h3>
          <div className="space-y-2">
            {(receiptData?.receipts || []).map((r) => (
              <div key={r.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="font-bold text-slate-700">{r.order_number}</div>
                  <div className="text-xs text-slate-500">{new Date(r.bill_printed_at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{r.order_type === 'direct' ? 'Takeway' : r.order_type} · {r.payment_method || '-'} {r.transaction_id ? `(${r.transaction_id})` : ''}</div>
                <div className="text-xs text-slate-500">Discount: ৳{parseFloat(r.discount_amount || 0).toFixed(2)} · Total: ৳{parseFloat(r.total_amount || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'transactions' && user?.role === 'admin' && (
        <div className="card p-6">
          <h3 className="text-sm font-black text-slate-800 mb-4">Transaction Report</h3>
          <div className="space-y-2">
            {(transactionData?.transactions || []).map((t) => (
              <div key={t.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="font-bold text-slate-700">{t.order_number}</div>
                  <div className="text-xs text-slate-500">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">Method: {t.transaction_id?.startsWith('NAGAD-') ? 'nagad' : t.payment_method} {t.transaction_id ? `(${t.transaction_id})` : ''}</div>
                <div className="text-xs text-slate-500">Amount: ৳{parseFloat(t.amount || 0).toFixed(2)} · Discount: ৳{parseFloat(t.discount_amount || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Order Detail Modal ── */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewingOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-800">
                Order Detail {viewingOrderDetail?.order ? `— ${viewingOrderDetail.order.order_number}` : ''}
              </h2>
              <button onClick={() => setViewingOrder(null)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {!viewingOrderDetail ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading…</div>
            ) : (
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-400 text-xs">Status</span><div className="font-semibold capitalize text-slate-700">{viewingOrderDetail.order?.status}</div></div>
                  <div><span className="text-slate-400 text-xs">Type</span><div className="font-semibold capitalize text-slate-700">{viewingOrderDetail.order?.order_type === 'direct' ? 'Takeaway' : viewingOrderDetail.order?.order_type}</div></div>
                  <div><span className="text-slate-400 text-xs">Total</span><div className="font-bold text-sky-600">৳{parseFloat(viewingOrderDetail.order?.total_amount || 0).toFixed(2)}</div></div>
                  <div><span className="text-slate-400 text-xs">Table</span><div className="font-semibold text-slate-700">{viewingOrderDetail.order?.table_number || '—'}</div></div>
                  {viewingOrderDetail.order?.customer_name && (
                    <div><span className="text-slate-400 text-xs">Customer</span><div className="font-semibold text-slate-700">{viewingOrderDetail.order.customer_name}</div></div>
                  )}
                  {viewingOrderDetail.order?.customer_phone && (
                    <div><span className="text-slate-400 text-xs">Phone</span><div className="font-semibold text-slate-700">{viewingOrderDetail.order.customer_phone}</div></div>
                  )}
                  <div className="col-span-2"><span className="text-slate-400 text-xs">Placed at</span><div className="font-semibold text-slate-700">{viewingOrderDetail.order?.created_at ? new Date(viewingOrderDetail.order.created_at).toLocaleString() : '—'}</div></div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items</div>
                  <div className="space-y-1">
                    {(viewingOrderDetail.items || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
                        <span className="text-slate-700">{item.item_name || item.name} <span className="text-slate-400">×{item.quantity}</span></span>
                        <span className="font-semibold text-slate-700">৳{parseFloat(item.total_price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {(viewingOrderDetail.payments || []).length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payments</div>
                    {viewingOrderDetail.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span className="capitalize text-slate-600">{p.payment_method}</span>
                        <span className="font-semibold text-slate-700">৳{parseFloat(p.amount || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {viewingOrderDetail.order?.cancellation_reason && (
                  <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                    <span className="font-semibold">Cancel Note:</span> {viewingOrderDetail.order.cancellation_reason}
                  </div>
                )}
                <button onClick={() => { setViewingOrder(null); navigate('/orders'); }} className="w-full btn btn-secondary btn-sm mt-2">Open in Orders Page</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Item Detail Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-800">{selectedItem.name}</h2>
              <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-sky-50 p-4 text-center">
                  <div className="text-2xl font-black text-sky-600">{selectedItem.sold}</div>
                  <div className="text-xs text-sky-500 mt-0.5">Units Sold</div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 text-center">
                  <div className="text-2xl font-black text-emerald-600">৳{(selectedItem.revenue || 0).toLocaleString()}</div>
                  <div className="text-xs text-emerald-500 mt-0.5">Revenue</div>
                </div>
                <div className="rounded-xl bg-violet-50 p-4 text-center">
                  <div className="text-2xl font-black text-violet-600">{selectedItem.orders}</div>
                  <div className="text-xs text-violet-500 mt-0.5">Orders</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-center">
                  <div className="text-2xl font-black text-amber-600">{selectedItem.cancelledCount}</div>
                  <div className="text-xs text-amber-500 mt-0.5">Cancelled</div>
                </div>
              </div>
              {selectedItem.category && (
                <div className="text-sm text-center text-slate-400">Category: <span className="font-semibold text-slate-600">{selectedItem.category}</span></div>
              )}
              <button onClick={() => { setSelectedItem(null); navigate('/reports'); }} className="w-full btn btn-secondary btn-sm mt-1">View Full Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
