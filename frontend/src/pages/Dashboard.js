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
import TabNavigation from '../components/Layout/TabNavigation';
import ReceiptsTab from '../components/shared/ReceiptsTab';
import TransactionsTab from '../components/shared/TransactionsTab';
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
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenuePeriod, setRevenuePeriod] = useState('today');
  const [revenueViewOrder, setRevenueViewOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [donutDetail, setDonutDetail] = useState(null); // null | 'qty' | 'revenue'

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
      refetchInterval: 30000,
      enabled: user?.role === 'admin' || user?.role === 'manager',
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
      enabled: user?.role === 'admin' || user?.role === 'manager',
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
      enabled: user?.role === 'admin' || user?.role === 'manager',
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
      enabled: user?.role === 'admin' || user?.role === 'manager',
    }
  );

  // Fetch today's reservations (admin/manager only — waiter dashboard has its own)
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
      refetchInterval: 60000,
      enabled: user?.role === 'admin' || user?.role === 'manager',
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
    { refetchInterval: 60000, enabled: user?.role === 'admin' || user?.role === 'manager' }
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

  const { data: revenueOrders } = useQuery(
    ['dash-revenue-orders', revenuePeriod, showRevenueModal],
    async () => {
      const now = new Date();
      let start, end;
      if (revenuePeriod === 'today') {
        start = end = now.toISOString().split('T')[0];
      } else if (revenuePeriod === 'yesterday') {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        start = end = y.toISOString().split('T')[0];
      } else {
        const w = new Date(now); w.setDate(w.getDate() - 6);
        start = w.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      }
      const response = await api.get('/orders', { params: { status: 'done', start_date: start, end_date: end, limit: 200 } });
      return response.data;
    },
    { enabled: showRevenueModal }
  );

  const { data: revenueOrderDetail } = useQuery(
    ['dash-rev-order-detail', revenueViewOrder],
    () => api.get(`/orders/${revenueViewOrder}`).then(r => r.data),
    { enabled: !!revenueViewOrder }
  );

  // Listen for real-time updates
  useEffect(() => {
    // Socket event listeners would be set up here
    // This is a placeholder for real-time updates

    return () => {
      // Cleanup
    };
  }, [refetchStats]);

  // Waiters and kitchen staff get a dedicated operational dashboard
  if (user?.role === 'waiter' || user?.role === 'kitchen') {
    return <WaiterDashboard api={api} user={user} isConnected={isConnected} />;
  }

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

  const allItems = menuPerfData?.item_performance || [];
  const donutTotalQty  = allItems.reduce((s, i) => s + parseInt(i.total_quantity || 0), 0);
  const donutTotalRev  = allItems.reduce((s, i) => s + parseFloat(i.total_revenue || 0), 0);
  const donutAvgPrice  = allItems.length ? allItems.reduce((s, i) => s + parseFloat(i.avg_unit_price || 0), 0) / allItems.length : 0;

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
        <div className="cursor-pointer" onClick={() => setShowRevenueModal(true)}>
          <StatCard
            title="Today's Revenue ↗"
            value={`৳${(todayStats.today_revenue || 0).toLocaleString()}`}
            icon={CurrencyDollarIcon}
            trend={revenueTrend}
            trendLabel="vs yesterday"
            color="sky"
          />
        </div>
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

      <TabNavigation activeTab={tab} setActiveTab={setTab} userRole={user?.role} />

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

      {/* ── Items Sold Donut Stats Card ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Items Sold — Last 7 Days</h3>
            <p className="text-xs text-slate-400">Click a stat to see full breakdown</p>
          </div>
        </div>
        <div className="flex items-start justify-around">
          {/* Total Qty Sold */}
          <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={() => setDonutDetail('qty')}>
            <div className="relative" style={{ width: 90, height: 90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#e5e7eb" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*36*0.78} ${2*Math.PI*36*0.22}`} strokeLinecap="round"
                  transform="rotate(129 45 45)" />
                <circle cx="45" cy="45" r="36" fill="none" stroke="#f97316" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*36*0.78*0.62} ${2*Math.PI*36*(1-0.78*0.62)}`} strokeLinecap="round"
                  transform="rotate(129 45 45)" />
                <circle cx={45 + 36 * Math.cos((129 * Math.PI) / 180)}
                        cy={45 + 36 * Math.sin((129 * Math.PI) / 180)}
                        r="4" fill="#f97316" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-gray-800 leading-tight text-center px-1">{donutTotalQty}</span>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-blue-600 underline decoration-dotted text-center leading-tight group-hover:text-blue-800">Total Qty Sold</p>
          </div>
          <div className="w-px bg-gray-100 self-stretch" />
          {/* Net Sales */}
          <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={() => setDonutDetail('revenue')}>
            <div className="relative" style={{ width: 90, height: 90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#e5e7eb" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*36*0.78} ${2*Math.PI*36*0.22}`} strokeLinecap="round"
                  transform="rotate(129 45 45)" />
                <circle cx="45" cy="45" r="36" fill="none" stroke="#22c55e" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*36*0.78*0.62} ${2*Math.PI*36*(1-0.78*0.62)}`} strokeLinecap="round"
                  transform="rotate(129 45 45)" />
                <circle cx={45 + 36 * Math.cos((129 * Math.PI) / 180)}
                        cy={45 + 36 * Math.sin((129 * Math.PI) / 180)}
                        r="4" fill="#22c55e" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-gray-800 leading-tight text-center px-1">৳{Math.round(donutTotalRev).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-blue-600 underline decoration-dotted text-center leading-tight group-hover:text-blue-800">Net Sales</p>
          </div>
          <div className="w-px bg-gray-100 self-stretch" />
          {/* Avg Item Price */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: 90, height: 90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#e5e7eb" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*36*0.78} ${2*Math.PI*36*0.22}`} strokeLinecap="round"
                  transform="rotate(129 45 45)" />
                <circle cx="45" cy="45" r="36" fill="none" stroke="#3b82f6" strokeWidth="5"
                  strokeDasharray={`${2*Math.PI*36*0.78*0.62} ${2*Math.PI*36*(1-0.78*0.62)}`} strokeLinecap="round"
                  transform="rotate(129 45 45)" />
                <circle cx={45 + 36 * Math.cos((129 * Math.PI) / 180)}
                        cy={45 + 36 * Math.sin((129 * Math.PI) / 180)}
                        r="4" fill="#3b82f6" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-gray-800 leading-tight text-center px-1">৳{Math.round(donutAvgPrice).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] font-semibold text-gray-600 text-center leading-tight">Avg Item Price</p>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {donutDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDonutDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {donutDetail === 'qty' ? 'Total Qty Sold — Item Breakdown' : 'Net Sales — Item Breakdown'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Last 7 days</p>
              </div>
              <button onClick={() => setDonutDetail(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {[...allItems]
                .sort((a, b) =>
                  donutDetail === 'qty'
                    ? parseInt(b.total_quantity || 0) - parseInt(a.total_quantity || 0)
                    : parseFloat(b.total_revenue || 0) - parseFloat(a.total_revenue || 0)
                )
                .map((item, i) => {
                  const maxVal = donutDetail === 'qty' ? donutTotalQty : donutTotalRev;
                  const val = donutDetail === 'qty' ? parseInt(item.total_quantity || 0) : parseFloat(item.total_revenue || 0);
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return (
                    <div key={item.id || i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800 truncate">{item.item_name}</span>
                          <span className="text-sm font-black text-gray-900 ml-2 shrink-0">
                            {donutDetail === 'qty' ? val : `৳${val.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: donutDetail === 'qty' ? '#f97316' : '#22c55e' }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{item.category_name} · {pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
            <div className="px-5 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-between text-xs text-gray-500">
              <span>{allItems.length} items</span>
              <span className="font-bold text-gray-800">
                Total: {donutDetail === 'qty' ? donutTotalQty : `৳${donutTotalRev.toFixed(2)}`}
              </span>
            </div>
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

      {tab === 'receipts' && user?.role === 'admin' && <ReceiptsTab />}
      {tab === 'transactions' && user?.role === 'admin' && <TransactionsTab />}
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

      {/* ── Revenue Drill-Down Modal ── */}
      {showRevenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowRevenueModal(false); setRevenueViewOrder(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-800">Revenue — Done Orders</h2>
              <button onClick={() => { setShowRevenueModal(false); setRevenueViewOrder(null); }} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {/* Period Tabs */}
            <div className="flex gap-1 px-6 pt-4">
              {[['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'Last 7 Days']].map(([val, label]) => (
                <button key={val} onClick={() => { setRevenuePeriod(val); setRevenueViewOrder(null); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${revenuePeriod === val ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="px-6 pb-6 mt-4 overflow-y-auto flex-1">
              {revenueViewOrder ? (
                <div>
                  <button onClick={() => setRevenueViewOrder(null)} className="text-xs text-sky-600 font-bold mb-3 hover:underline">← Back to list</button>
                  {!revenueOrderDetail ? (
                    <div className="flex justify-center py-10"><LoadingSpinner /></div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-400 text-xs block">Order #</span><span className="font-mono font-black">{revenueOrderDetail.order?.order_number}</span></div>
                        <div><span className="text-slate-400 text-xs block">Total</span><span className="font-bold text-sky-600">৳{parseFloat(revenueOrderDetail.order?.total_amount || 0).toFixed(2)}</span></div>
                        <div><span className="text-slate-400 text-xs block">Type</span><span className="font-semibold capitalize">{revenueOrderDetail.order?.order_type === 'direct' ? 'Takeaway' : revenueOrderDetail.order?.order_type}</span></div>
                        <div><span className="text-slate-400 text-xs block">Table</span><span className="font-semibold">{revenueOrderDetail.order?.table_number || '—'}</span></div>
                        {revenueOrderDetail.order?.customer_name && (
                          <div><span className="text-slate-400 text-xs block">Customer</span><span className="font-semibold">{revenueOrderDetail.order.customer_name}</span></div>
                        )}
                        <div><span className="text-slate-400 text-xs block">Placed At</span><span className="font-semibold">{revenueOrderDetail.order?.created_at ? new Date(revenueOrderDetail.order.created_at).toLocaleString() : '—'}</span></div>
                      </div>
                      {(revenueOrderDetail.items || []).length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Items</p>
                          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                            {revenueOrderDetail.items.map((item, i) => (
                              <div key={i} className="flex justify-between px-3 py-2 text-sm">
                                <span>{item.quantity}× {item.menu_item_name || item.name}</span>
                                <span className="font-semibold">৳{parseFloat(item.subtotal || item.unit_price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : !revenueOrders ? (
                <div className="flex justify-center py-10"><LoadingSpinner /></div>
              ) : (revenueOrders.orders || []).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">No done orders for this period</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 font-semibold mb-3">{(revenueOrders.orders || []).length} done orders · ৳{(revenueOrders.orders || []).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0).toFixed(0)} total</p>
                  {(revenueOrders.orders || []).map(order => (
                    <button key={order.id} onClick={() => setRevenueViewOrder(order.id)}
                      className="w-full text-left card p-3 hover:bg-sky-50 hover:border-sky-200 transition-colors border border-transparent">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-black text-slate-700 text-sm">{order.order_number}</span>
                          {order.customer_name && <span className="ml-2 text-xs text-slate-500">{order.customer_name}</span>}
                          <div className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                        </div>
                        <span className="font-bold text-sky-600 text-sm">৳{parseFloat(order.total_amount || 0).toFixed(0)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Waiter / Kitchen Dashboard — operational view, zero financial data
// ─────────────────────────────────────────────────────────────────────────────
function WaiterDashboard({ api, user, isConnected }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const STATUS_COLORS = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    preparing: 'bg-blue-50  text-blue-700  border-blue-200',
    ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    done:      'bg-slate-100 text-slate-500 border-slate-200',
    hold:      'bg-orange-50 text-orange-600 border-orange-200',
  };

  // My active orders
  const { data: myOrdersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery(
    ['waiter-my-orders', user?.id],
    () => api.get('/orders', {
      params: { waiter_id: user?.id, limit: 50 }
    }).then(r => r.data),
    { refetchInterval: 15000 }
  );

  // Table overview
  const { data: tableData } = useQuery(
    'waiter-tables',
    () => api.get('/tables/stats/overview').then(r => r.data),
    { refetchInterval: 20000 }
  );

  // Kitchen queue
  const { data: kitchenData } = useQuery(
    'waiter-kitchen',
    () => api.get('/kitchen', { params: { limit: 100 } }).then(r => r.data),
    { refetchInterval: 10000 }
  );

  // Today's reservations
  const { data: resvData } = useQuery(
    'waiter-reservations',
    () => api.get('/reservations/today/list').then(r => r.data),
    { refetchInterval: 60000 }
  );

  const allOrders = myOrdersData?.orders || [];
  const activeOrders = allOrders.filter(o => ['pending', 'preparing', 'ready', 'hold'].includes(o.status));
  const todayCount = allOrders.length;

  const tables     = tableData?.todayOccupancy || {};
  const kStats     = kitchenData?.stats || {};
  const queued     = parseInt(kStats.queued    || 0);
  const preparing  = parseInt(kStats.preparing || 0);
  const ready      = parseInt(kStats.ready     || 0);
  const reservations = resvData?.reservations || [];

  const quickActions = [
    { label: 'New Order',    icon: '🛍️', path: '/orders',       color: 'bg-sky-500   hover:bg-sky-600'    },
    { label: 'Kitchen',      icon: '🍳', path: '/kitchen',      color: 'bg-amber-500 hover:bg-amber-600'  },
    { label: 'Tables',       icon: '🪑', path: '/tables',       color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Reservations', icon: '📅', path: '/reservations', color: 'bg-violet-500 hover:bg-violet-600' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Welcome banner */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 60%, #38BDF8 100%)' }}>
        <div className="absolute right-4 top-0 bottom-0 flex items-center opacity-10 text-8xl select-none">☕</div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sky-200 text-sm font-medium">{greeting},</p>
            <h1 className="text-xl font-black mt-0.5">{user?.full_name} 👋</h1>
            <p className="text-sky-100 text-sm mt-1">
              {activeOrders.length > 0
                ? `${activeOrders.length} active order${activeOrders.length !== 1 ? 's' : ''} needs attention`
                : 'No active orders right now'}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
            isConnected ? 'bg-white/20 text-white' : 'bg-rose-500/50 text-white'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-rose-200'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map(a => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className={`${a.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-colors active:scale-95`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-xs font-bold">{a.label}</span>
          </button>
        ))}
      </div>

      {/* My active orders */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h2 className="font-black text-slate-800">My Active Orders</h2>
            <p className="text-xs text-slate-400 mt-0.5">{todayCount} orders placed today</p>
          </div>
          <button onClick={() => refetchOrders()}
            className="btn btn-secondary btn-sm text-xs">Refresh</button>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : activeOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <ShoppingCartIcon className="h-10 w-10 mx-auto mb-2 text-slate-200" />
            <p className="font-medium">No active orders</p>
            <button onClick={() => navigate('/orders')} className="btn btn-primary mt-3 text-sm">
              + New Order
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activeOrders.map(order => (
              <div key={order.id}
                onClick={() => navigate('/orders')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                    {order.table_number && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        Table {order.table_number}
                      </span>
                    )}
                    {!order.table_number && order.order_type === 'delivery' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">Delivery</span>
                    )}
                    {!order.table_number && order.order_type === 'direct' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">Takeaway</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {order.customer_name ? ` · ${order.customer_name}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize flex-shrink-0 ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                  {order.status === 'hold' ? '⏸ Hold' : order.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status overview row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Table status */}
        <div className="card p-4">
          <h3 className="font-black text-slate-700 text-sm mb-3 flex items-center gap-2">
            <span>🪑</span> Table Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm text-slate-600">Available</span>
              </div>
              <span className="font-black text-slate-800">{tables.available_tables ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="text-sm text-slate-600">Occupied</span>
              </div>
              <span className="font-black text-slate-800">{tables.occupied_tables ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-sm text-slate-600">Reserved</span>
              </div>
              <span className="font-black text-slate-800">{tables.reserved_tables ?? '—'}</span>
            </div>
          </div>
          <button onClick={() => navigate('/tables')}
            className="mt-3 w-full text-xs text-sky-600 font-semibold hover:underline text-center">
            View Floor Map →
          </button>
        </div>

        {/* Kitchen queue */}
        <div className="card p-4">
          <h3 className="font-black text-slate-700 text-sm mb-3 flex items-center gap-2">
            <span>🍳</span> Kitchen Queue
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-sm text-slate-600">Queued</span>
              </div>
              <span className="font-black text-slate-800">{queued}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-sm text-slate-600">Preparing</span>
              </div>
              <span className="font-black text-slate-800">{preparing}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm text-slate-600">Ready</span>
              </div>
              <span className={`font-black ${ready > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{ready}</span>
            </div>
          </div>
          <button onClick={() => navigate('/kitchen')}
            className="mt-3 w-full text-xs text-sky-600 font-semibold hover:underline text-center">
            Open Kitchen Display →
          </button>
        </div>
      </div>

      {/* Today's reservations */}
      {reservations.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="font-black text-slate-800">Today's Reservations</h2>
            <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-1 rounded-full">{reservations.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {reservations.slice(0, 6).map((r, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-black text-slate-800 w-14 flex-shrink-0">
                  {r.reservation_time?.slice(0, 5)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{r.customer_name}</p>
                  <p className="text-xs text-slate-400">{r.party_size} guests{r.table_number ? ` · Table ${r.table_number}` : ''}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0 ${
                  r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                  r.status === 'pending'   ? 'bg-amber-50 text-amber-700' :
                  'bg-slate-100 text-slate-500'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          {reservations.length > 6 && (
            <div className="p-3 text-center">
              <button onClick={() => navigate('/reservations')} className="text-xs text-sky-600 font-semibold hover:underline">
                View all {reservations.length} reservations →
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default Dashboard;
