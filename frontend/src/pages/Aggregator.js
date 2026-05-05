import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Live Orders', 'settlement': 'Settlement', 'commissions': 'Commissions', 'analytics': 'Analytics' };
const TAB_PATH = { 'Live Orders': '', 'Settlement': 'settlement', 'Commissions': 'commissions', 'Analytics': 'analytics' };

const ORDERS = [
  { id: 1, platform: 'Talabat', order_ref: 'TAL-98231', customer: 'Ahmed S.', items: 'Chicken Biryani x2, Juice', order_amount: 90, commission_deducted: 22.5, status: 'preparing', ordered_at: '14:23' },
  { id: 2, platform: 'Deliveroo', order_ref: 'DEL-45621', customer: 'Maria K.', items: 'Grilled Fish, Salad', order_amount: 75, commission_deducted: 21.0, status: 'accepted', ordered_at: '14:18' },
  { id: 3, platform: 'Noon Food', order_ref: 'NON-12390', customer: 'Omar B.', items: 'Lamb Kebab Platter', order_amount: 110, commission_deducted: 30.8, status: 'dispatched', ordered_at: '13:55' },
  { id: 4, platform: 'Careem Food', order_ref: 'CAR-77821', customer: 'Sara N.', items: 'Family Meal Deal', order_amount: 185, commission_deducted: 40.7, status: 'delivered', ordered_at: '13:30' },
];

const SETTLEMENTS = [
  { id: 1, platform: 'Talabat', period_start: '2025-01-01', period_end: '2025-01-15', gross_revenue: 28450, commission_amount: 7112.5, taxes_deducted: 1422.5, net_payout: 19915, is_reconciled: true, settled_date: '2025-01-20' },
  { id: 2, platform: 'Deliveroo', period_start: '2025-01-01', period_end: '2025-01-15', gross_revenue: 14200, commission_amount: 3977.5, taxes_deducted: 710, net_payout: 9512.5, is_reconciled: false, settled_date: null },
  { id: 3, platform: 'Noon Food', period_start: '2025-01-01', period_end: '2025-01-15', gross_revenue: 9840, commission_amount: 2755.2, taxes_deducted: 492, net_payout: 6592.8, is_reconciled: false, settled_date: null },
];

const COMMISSIONS = [
  { platform: 'Talabat', rate: 25, orders_30d: 842, gross_30d: 57200, commission_30d: 14300, net_30d: 42900 },
  { platform: 'Deliveroo', rate: 28, orders_30d: 420, gross_30d: 28400, commission_30d: 7952, net_30d: 20448 },
  { platform: 'Noon Food', rate: 28, orders_30d: 285, gross_30d: 18900, commission_30d: 5292, net_30d: 13608 },
  { platform: 'Careem Food', rate: 22, orders_30d: 194, gross_30d: 13200, commission_30d: 2904, net_30d: 10296 },
];

const STATUS_COLORS = { accepted: 'bg-blue-100 text-blue-800', preparing: 'bg-yellow-100 text-yellow-800', dispatched: 'bg-purple-100 text-purple-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' };
const PLATFORM_COLORS = { Talabat: 'bg-orange-100 text-orange-700', Deliveroo: 'bg-teal-100 text-teal-700', 'Noon Food': 'bg-yellow-100 text-yellow-700', 'Careem Food': 'bg-green-100 text-green-700' };

export default function Aggregator() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/aggregator\/?/, '');
  const tab = PATH_MAP[subPath] || 'Live Orders';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/aggregator/${TAB_PATH[t]}` : '/aggregator');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Online Order Aggregator</h1>
        <p className="text-sm text-gray-500 mt-1">Manage orders from all delivery platforms in one place</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Orders', value: ORDERS.filter(o => o.status !== 'delivered').length, color: 'blue' }, { label: 'Revenue Today', value: `AED ${ORDERS.reduce((s,o) => s + o.order_amount, 0).toLocaleString()}`, color: 'green' }, { label: 'Commission Today', value: `AED ${ORDERS.reduce((s,o) => s + o.commission_deducted, 0).toFixed(0)}`, color: 'red' }, { label: 'Pending Settlement', value: '2 platforms', color: 'yellow' }].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold text-${k.color}-600 mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {Object.keys(TAB_PATH).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'Live Orders' && (
        <div className="space-y-3">{ORDERS.map(o => (
          <div key={o.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <div className="flex items-start gap-3">
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${PLATFORM_COLORS[o.platform]}`}>{o.platform}</span>
              <div>
                <p className="font-medium text-gray-900 text-sm">{o.order_ref} · {o.customer}</p>
                <p className="text-xs text-gray-500 mt-0.5">{o.items}</p>
                <p className="text-xs text-gray-400 mt-0.5">Ordered: {o.ordered_at}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">AED {o.order_amount}</p>
              <p className="text-xs text-red-500">-AED {o.commission_deducted} commission</p>
              <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>{o.status}</span>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Settlement' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Platform', 'Period', 'Gross Revenue', 'Commission', 'Taxes', 'Net Payout', 'Reconciled'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SETTLEMENTS.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.platform}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.period_start} – {s.period_end}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {s.gross_revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {s.commission_amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {s.taxes_deducted.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">AED {s.net_payout.toLocaleString()}</td>
                <td className="px-4 py-3">{s.is_reconciled ? <span className="text-green-600 text-xs font-medium">✓ Reconciled</span> : <button className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg">Reconcile</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Commissions' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Platform', 'Rate', 'Orders (30d)', 'Gross (30d)', 'Commission', 'Net Revenue'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{COMMISSIONS.map(c => (
              <tr key={c.platform} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.platform}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">{c.rate}%</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.orders_30d.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {c.gross_30d.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {c.commission_30d.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">AED {c.net_30d.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{COMMISSIONS.map(c => (
          <div key={c.platform} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">{c.platform}</h3>
              <span className="text-2xl font-bold text-indigo-600">AED {c.net_30d.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Orders</span><span className="font-medium">{c.orders_30d}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Avg Order Value</span><span className="font-medium">AED {Math.round(c.gross_30d / c.orders_30d)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Commission Rate</span><span className="text-red-600 font-medium">{c.rate}%</span></div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Net Revenue %</span><span>{((c.net_30d / c.gross_30d) * 100).toFixed(1)}%</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{ width: `${(c.net_30d / c.gross_30d) * 100}%` }}></div></div>
              </div>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
