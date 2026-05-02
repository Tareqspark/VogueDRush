import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const CHART_COLORS = { primary: '#0284C7', secondary: '#EAB308', accent: '#10B981' };

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function Reports() {
  const { api } = useAuth();
  const [tab, setTab] = useState('sales');
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [period, setPeriod] = useState('daily');

  const { data: salesData, isLoading: salesLoading } = useQuery(
    ['sales-report', startDate, endDate, period],
    () => api.get('/reports/sales', { params: { start_date: startDate, end_date: endDate, period } }).then(r => r.data),
    { enabled: tab === 'sales' }
  );

  const { data: menuData, isLoading: menuLoading } = useQuery(
    ['menu-performance', startDate, endDate],
    () => api.get('/reports/menu-performance', { params: { start_date: startDate, end_date: endDate, limit: 10 } }).then(r => r.data),
    { enabled: tab === 'menu' }
  );

  const summary = salesData?.summary || {};
  const chartData = (salesData?.sales_data || []).map(row => ({
    ...row,
    date: row.period ? formatDate(row.period.toString()) : '',
    revenue: parseFloat(row.revenue || 0),
    orders: parseInt(row.order_count || 0),
  }));

  const topItems = menuData?.item_performance || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-black text-slate-800">Reports & Analytics 📈</h1>

      {/* Date range + period */}
      <div className="flex flex-wrap gap-3 items-end">
        <div><label className="label text-xs">From</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" /></div>
        <div><label className="label text-xs">To</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" /></div>
        <div>
          <label className="label text-xs">Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="select">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button onClick={() => { setStartDate(sevenDaysAgo); setEndDate(today); }} className="btn btn-secondary btn-sm">Last 7 Days</button>
        <button onClick={() => {
          const m = new Date(); m.setDate(1);
          setStartDate(m.toISOString().split('T')[0]); setEndDate(today);
        }} className="btn btn-secondary btn-sm">This Month</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {['sales', 'menu'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t === 'sales' ? 'Sales Report' : 'Menu Performance'}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        salesLoading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Revenue', value: `৳${parseFloat(summary.total_revenue || 0).toFixed(2)}`, color: 'text-sky-600' },
                { label: 'Total Orders', value: summary.total_orders || 0, color: 'text-sky-600' },
                { label: 'Avg Order Value', value: `৳${parseFloat(summary.avg_order_value || 0).toFixed(2)}`, color: 'text-emerald-600' },
                { label: 'Total VAT', value: `৳${parseFloat(summary.total_vat || 0).toFixed(2)}`, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="card p-4">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-600 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            {chartData.length > 0 && (
              <div className="card p-4">
                <div className="text-sm font-medium text-slate-600 mb-3">Revenue Over Time</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 20px rgba(2,132,199,0.1)' }} labelStyle={{ color: '#0f172a', fontWeight: 700 }} />
                    <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[3,3,0,0]} name="Revenue (৳)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Orders chart */}
            {chartData.length > 0 && (
              <div className="card p-4">
                <div className="text-sm font-medium text-slate-600 mb-3">Orders Over Time</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 20px rgba(2,132,199,0.1)' }} />
                    <Line type="monotone" dataKey="orders" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ fill: CHART_COLORS.secondary }} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )
      )}

      {tab === 'menu' && (
        menuLoading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> : (
          <div className="space-y-4">
            {topItems.length === 0 ? (
              <div className="card p-12 text-center text-slate-600">No data for this period.</div>
            ) : (
              <>
                <div className="card p-4">
                  <div className="text-sm font-medium text-slate-600 mb-3">Top 10 Items by Revenue</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topItems.map(i => ({ name: i.item_name?.slice(0,15), revenue: parseFloat(i.total_revenue || 0), qty: parseInt(i.total_quantity || 0) }))} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                      <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 4px 20px rgba(2,132,199,0.1)' }} />
                      <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[0,3,3,0]} name="Revenue (৳)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-2">
                  {topItems.map((item, i) => (
                    <div key={item.id || i} className="card p-3 flex items-center gap-3">
                      <span className="text-slate-400 text-sm w-5">#{i+1}</span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{item.item_name}</div>
                        <div className="text-xs text-slate-500">{item.category_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sky-600">৳{parseFloat(item.total_revenue||0).toFixed(2)}</div>
                        <div className="text-xs text-slate-500">{item.total_quantity} sold</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
