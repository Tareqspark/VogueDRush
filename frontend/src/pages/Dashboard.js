import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
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
  const [selectedPeriod] = useState('today');

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

  // Prepare dashboard data
  const todayStats = orderStats?.todayStats || {};
  const statusStats = orderStats?.statusStats || [];
  const typeStats = orderStats?.typeStats || [];
  const tableOccupancy = tableStats?.todayOccupancy || {};
  const kitchenWorkload = kitchenStats?.currentWorkload || {};
  const revenueTrend = 5.2;
  const ordersTrend = -2.1;

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
              <div key={s.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`status-badge status-${s.status}`}>{s.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">{s.count}</span>
                  <span className="text-xs text-slate-400">৳{(s.total_revenue || 0).toLocaleString()}</span>
                </div>
              </div>
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
              <div key={t.order_type} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {t.order_type === 'dine_in' && <RectangleGroupIcon className="h-4 w-4 text-sky-500" />}
                  {t.order_type === 'delivery' && <TruckIcon className="h-4 w-4 text-amber-500" />}
                  {t.order_type === 'direct' && <UsersIcon className="h-4 w-4 text-emerald-500" />}
                  <span className="text-sm text-slate-600 capitalize">{t.order_type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-700">{t.count}</span>
                  <span className="text-xs text-slate-400">৳{(t.total_revenue || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
