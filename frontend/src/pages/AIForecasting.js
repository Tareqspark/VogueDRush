import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Demand', 'inventory': 'Inventory', 'churn': 'Churn', 'menu': 'Menu Mix', 'staffing': 'Staffing' };
const TAB_PATH = { 'Demand': '', 'Inventory': 'inventory', 'Churn': 'churn', 'Menu Mix': 'menu', 'Staffing': 'staffing' };

const DEMAND_FORECAST = [
  { day: 'Mon Jan 27', predicted_covers: 210, predicted_revenue: 18900, confidence: 87, vs_last_week: +5.2 },
  { day: 'Tue Jan 28', predicted_covers: 185, predicted_revenue: 16650, confidence: 84, vs_last_week: -2.1 },
  { day: 'Wed Jan 29', predicted_covers: 225, predicted_revenue: 20250, confidence: 90, vs_last_week: +8.4 },
  { day: 'Thu Jan 30', predicted_covers: 290, predicted_revenue: 26100, confidence: 92, vs_last_week: +12.1 },
  { day: 'Fri Jan 31', predicted_covers: 380, predicted_revenue: 34200, confidence: 95, vs_last_week: +6.3 },
  { day: 'Sat Feb 01', predicted_covers: 420, predicted_revenue: 37800, confidence: 94, vs_last_week: +3.8 },
  { day: 'Sun Feb 02', predicted_covers: 350, predicted_revenue: 31500, confidence: 91, vs_last_week: -1.5 },
];

const INVENTORY_FORECAST = [
  { ingredient: 'Basmati Rice', current_stock: 45, unit: 'kg', predicted_usage: 120, reorder_threshold: 30, suggested_order: 150, urgency: 'high' },
  { ingredient: 'Chicken Thighs', current_stock: 22, unit: 'kg', predicted_usage: 85, reorder_threshold: 15, suggested_order: 100, urgency: 'high' },
  { ingredient: 'Olive Oil', current_stock: 18, unit: 'L', predicted_usage: 12, reorder_threshold: 10, suggested_order: 20, urgency: 'medium' },
  { ingredient: 'Tomatoes', current_stock: 35, unit: 'kg', predicted_usage: 30, reorder_threshold: 20, suggested_order: 50, urgency: 'low' },
];

const CHURN_RISK = [
  { customer: 'Khalid Al Rashid', phone: '+971501234567', last_order: '65 days ago', total_orders: 28, avg_spend: 142, risk_score: 91, segment: 'High Value' },
  { customer: 'Maria Fernandez', phone: '+971559876543', last_order: '58 days ago', total_orders: 14, avg_spend: 89, risk_score: 78, segment: 'Regular' },
  { customer: 'Omar Al Mansoori', phone: '+971504567890', last_order: '72 days ago', total_orders: 45, avg_spend: 210, risk_score: 95, segment: 'VIP' },
];

const MENU_MIX = [
  { item: 'Chicken Biryani', category: 'Mains', predicted_popularity: 'Star', predicted_orders_week: 280, margin: 68, recommendation: 'Feature prominently' },
  { item: 'Lamb Kebab Platter', category: 'Mains', predicted_popularity: 'Star', predicted_orders_week: 195, margin: 72, recommendation: 'Promote on weekends' },
  { item: 'Vegetable Curry', category: 'Mains', predicted_popularity: 'Plow Horse', predicted_orders_week: 89, margin: 55, recommendation: 'Reprice or reposition' },
  { item: 'Grilled Fish', category: 'Mains', predicted_popularity: 'Puzzle', predicted_orders_week: 64, margin: 74, recommendation: 'Increase visibility' },
];

const STAFFING = [
  { day: 'Friday', lunch_staff: 12, dinner_staff: 15, bar_staff: 4, total: 31, note: 'Peak day — full team required' },
  { day: 'Saturday', lunch_staff: 10, dinner_staff: 14, bar_staff: 4, total: 28, note: 'High demand evening' },
  { day: 'Sunday', lunch_staff: 9, dinner_staff: 12, bar_staff: 3, total: 24, note: 'Family dining peak' },
  { day: 'Weekdays (avg)', lunch_staff: 6, dinner_staff: 8, bar_staff: 2, total: 16, note: 'Standard operations' },
];

const URGENCY_COLORS = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
const POP_COLORS = { Star: 'bg-yellow-100 text-yellow-800', 'Plow Horse': 'bg-gray-100 text-gray-700', Puzzle: 'bg-blue-100 text-blue-700', Dog: 'bg-red-100 text-red-600' };

export default function AIForecasting() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/forecasting\/?/, '');
  const tab = PATH_MAP[subPath] || 'Demand';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/forecasting/${TAB_PATH[t]}` : '/forecasting');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI & Forecasting</h1>
          <p className="text-sm text-gray-500 mt-1">ML-powered demand, inventory, churn, and staffing predictions</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Retrain Models</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Predicted Revenue (7d)', value: 'AED 185,400', color: 'green' }, { label: 'Churn Risk Customers', value: CHURN_RISK.length, color: 'red' }, { label: 'Reorder Alerts', value: INVENTORY_FORECAST.filter(i => i.urgency === 'high').length, color: 'orange' }, { label: 'Model Accuracy', value: '91.2%', color: 'indigo' }].map(k => (
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

      {tab === 'Demand' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Day', 'Predicted Covers', 'Predicted Revenue', 'Confidence', 'vs Last Week'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{DEMAND_FORECAST.map(d => (
              <tr key={d.day} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.day}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{d.predicted_covers}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">AED {d.predicted_revenue.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2"><div className="w-16 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${d.confidence}%` }}></div></div>
                  <span className="text-xs text-gray-600">{d.confidence}%</span></div>
                </td>
                <td className={`px-4 py-3 text-sm font-medium ${d.vs_last_week >= 0 ? 'text-green-600' : 'text-red-600'}`}>{d.vs_last_week >= 0 ? '+' : ''}{d.vs_last_week}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Inventory' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Ingredient', 'Current Stock', 'Predicted Usage (7d)', 'Reorder At', 'Suggested Order', 'Urgency'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{INVENTORY_FORECAST.map(i => (
              <tr key={i.ingredient} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{i.ingredient}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{i.current_stock} {i.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{i.predicted_usage} {i.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{i.reorder_threshold} {i.unit}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{i.suggested_order} {i.unit}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_COLORS[i.urgency]}`}>{i.urgency}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Churn' && (
        <div className="space-y-3">{CHURN_RISK.map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-red-100 p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-gray-900">{c.customer}</p>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{c.segment}</span>
              </div>
              <p className="text-sm text-gray-500">{c.phone} · Last order: {c.last_order}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.total_orders} orders · Avg spend AED {c.avg_spend}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${c.risk_score >= 90 ? 'text-red-600' : 'text-orange-500'}`}>{c.risk_score}%</div>
              <p className="text-xs text-gray-400">churn risk</p>
              <button className="mt-2 text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Send Offer</button>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Menu Mix' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Item', 'Category', 'Popularity Class', 'Orders (7d)', 'Margin %', 'Recommendation'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{MENU_MIX.map(m => (
              <tr key={m.item} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.item}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.category}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${POP_COLORS[m.predicted_popularity]}`}>{m.predicted_popularity}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{m.predicted_orders_week}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">{m.margin}%</td>
                <td className="px-4 py-3 text-sm text-gray-500 italic">{m.recommendation}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Staffing' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Day', 'Lunch Staff', 'Dinner Staff', 'Bar/Service', 'Total', 'Notes'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{STAFFING.map(s => (
              <tr key={s.day} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.day}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.lunch_staff}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.dinner_staff}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.bar_staff}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{s.total}</td>
                <td className="px-4 py-3 text-xs text-gray-500 italic">{s.note}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
