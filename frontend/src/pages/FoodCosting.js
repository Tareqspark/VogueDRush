import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Cost Overview', 'margins': 'Plate Margins', 'portions': 'Portion Calculator', 'alerts': 'Cost Alerts' };
const TAB_PATH = { 'Cost Overview': '', 'Plate Margins': 'margins', 'Portion Calculator': 'portions', 'Cost Alerts': 'alerts' };

const SNAPSHOTS = [
  { id: 1, period: 'Jan 2025', total_food_cost: 48200, total_revenue: 182500, food_cost_pct: 26.4, status: 'finalized' },
  { id: 2, period: 'Dec 2024', total_food_cost: 45600, total_revenue: 174300, food_cost_pct: 26.2, status: 'finalized' },
  { id: 3, period: 'Nov 2024', total_food_cost: 51200, total_revenue: 190000, food_cost_pct: 26.9, status: 'finalized' },
];

const MARGINS = [
  { id: 1, item: 'Chicken Biryani', selling_price: 45, portion_cost: 10.8, gross_margin: 34.2, margin_pct: 76.0, category: 'Mains' },
  { id: 2, item: 'Grilled Fish', selling_price: 65, portion_cost: 22.5, gross_margin: 42.5, margin_pct: 65.4, category: 'Mains' },
  { id: 3, item: 'Hummus', selling_price: 25, portion_cost: 3.8, gross_margin: 21.2, margin_pct: 84.8, category: 'Starters' },
  { id: 4, item: 'Lamb Kebab', selling_price: 75, portion_cost: 31.5, gross_margin: 43.5, margin_pct: 58.0, category: 'Mains' },
  { id: 5, item: 'Baklava', selling_price: 18, portion_cost: 4.2, gross_margin: 13.8, margin_pct: 76.7, category: 'Desserts' },
];

const PORTIONS = [
  { id: 1, item: 'Chicken Biryani', chicken_g: 200, rice_g: 150, spices_g: 15, sauce_ml: 80, total_cost: 10.8 },
  { id: 2, item: 'Grilled Fish', fish_g: 250, marinade_g: 25, sides_g: 100, total_cost: 22.5 },
];

const ALERTS = [
  { id: 1, item: 'Lamb Kebab', alert_type: 'Low Margin', current_margin_pct: 58.0, threshold_pct: 60, message: 'Margin below 60% target' },
  { id: 2, item: 'Mixed Grill', alert_type: 'Cost Spike', current_margin_pct: 51.2, threshold_pct: 55, message: 'Ingredient cost increased 12% this week' },
];

export default function FoodCosting() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/food-costing\/?/, '');
  const tab = PATH_MAP[subPath] || 'Cost Overview';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/food-costing/${TAB_PATH[t]}` : '/food-costing');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Food Costing Engine</h1>
        <p className="text-sm text-gray-500 mt-1">Track food cost %, plate margins and portion costs</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Avg Food Cost %', value: '26.4%', color: 'blue' }, { label: 'Best Margin Item', value: 'Hummus 84.8%', color: 'green' }, { label: 'Cost Alerts', value: '2', color: 'red' }, { label: 'Items Costed', value: '87', color: 'purple' }].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold text-${k.color}-600 mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {Object.keys(TAB_PATH).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'Cost Overview' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Period', 'Total Food Cost', 'Revenue', 'Food Cost %', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SNAPSHOTS.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.period}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {s.total_food_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {s.total_revenue.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`font-bold ${s.food_cost_pct < 28 ? 'text-green-600' : 'text-red-600'}`}>{s.food_cost_pct}%</span></td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{s.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Plate Margins' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Menu Item', 'Category', 'Selling Price', 'Portion Cost', 'Gross Margin', 'Margin %'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{MARGINS.sort((a,b) => b.margin_pct - a.margin_pct).map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.item}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.category}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {m.selling_price}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {m.portion_cost}</td>
                <td className="px-4 py-3 text-sm text-green-600 font-medium">AED {m.gross_margin.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${m.margin_pct >= 70 ? 'bg-green-500' : m.margin_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${m.margin_pct}%` }}></div></div>
                    <span className={`text-sm font-bold ${m.margin_pct >= 70 ? 'text-green-600' : m.margin_pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{m.margin_pct}%</span>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Portion Calculator' && (
        <div className="space-y-4">
          {PORTIONS.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">{p.item}</h3>
                <span className="text-lg font-bold text-indigo-600">AED {p.total_cost} / portion</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(p).filter(([k]) => !['id', 'item', 'total_cost'].includes(k)).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-medium text-gray-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Cost Alerts' && (
        <div className="space-y-3">
          {ALERTS.map(a => (
            <div key={a.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="font-medium text-red-800">{a.item} — {a.alert_type}</p>
                <p className="text-sm text-red-600 mt-1">{a.message}</p>
                <p className="text-xs text-gray-500 mt-1">Current: {a.current_margin_pct}% | Target: &gt;{a.threshold_pct}%</p>
              </div>
              <button className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">Review</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
