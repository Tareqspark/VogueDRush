import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Auto-PO', 'quotes': 'Quote Compare', 'history': 'Price History', 'rules': 'Rules' };
const TAB_PATH = { 'Auto-PO': '', 'Quote Compare': 'quotes', 'Price History': 'history', 'Rules': 'rules' };

const AUTO_PO = [
  { id: 1, item: 'Chicken (Fresh)', supplier: 'Al Khair Farms', qty: '100 kg', unit_price: 22.5, total: 2250, trigger: 'Stock below 20 kg', status: 'pending' },
  { id: 2, item: 'Basmati Rice', supplier: 'Gulf Grains Co', qty: '200 kg', unit_price: 8.5, total: 1700, trigger: 'Weekly auto-order', status: 'approved' },
  { id: 3, item: 'Olive Oil', supplier: 'Medpro Supplies', qty: '50 L', unit_price: 45, total: 2250, trigger: 'Stock below 10 L', status: 'sent' },
];

const QUOTES = [
  { item: 'Chicken (Fresh)', quotes: [{ supplier: 'Al Khair Farms', price: 22.5, delivery_days: 1, rating: 4.8 }, { supplier: 'Fresh Direct', price: 21.8, delivery_days: 2, rating: 4.5 }, { supplier: 'Metro Foods', price: 23.0, delivery_days: 1, rating: 4.7 }] },
  { item: 'Basmati Rice', quotes: [{ supplier: 'Gulf Grains Co', price: 8.5, delivery_days: 3, rating: 4.6 }, { supplier: 'Rice Palace', price: 7.9, delivery_days: 4, rating: 4.3 }] },
];

const HISTORY = [
  { item: 'Chicken (Fresh)', supplier: 'Al Khair Farms', jan: 21.0, feb: 21.5, mar: 22.0, apr: 22.5, trend: 'up' },
  { item: 'Basmati Rice', supplier: 'Gulf Grains Co', jan: 8.0, feb: 8.0, mar: 8.3, apr: 8.5, trend: 'up' },
  { item: 'Tomatoes', supplier: 'Fresh Direct', jan: 4.5, feb: 3.8, mar: 4.2, apr: 4.0, trend: 'stable' },
];

const RULES = [
  { id: 1, item: 'Chicken (Fresh)', trigger_type: 'min_stock', threshold: '20 kg', action: 'auto_po', preferred_supplier: 'Al Khair Farms', qty: '100 kg', is_active: true },
  { id: 2, item: 'Basmati Rice', trigger_type: 'weekly', threshold: 'Monday', action: 'auto_po', preferred_supplier: 'Gulf Grains Co', qty: '200 kg', is_active: true },
  { id: 3, item: 'Lamb', trigger_type: 'min_stock', threshold: '30 kg', action: 'notify_only', preferred_supplier: 'Metro Foods', qty: '80 kg', is_active: false },
];

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-blue-100 text-blue-800', sent: 'bg-green-100 text-green-800' };

export default function ProcurementIntel() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/procurement\/?/, '');
  const tab = PATH_MAP[subPath] || 'Auto-PO';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/procurement/${TAB_PATH[t]}` : '/procurement');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Intelligence</h1>
        <p className="text-sm text-gray-500 mt-1">Automated purchase orders, supplier quote comparison and price tracking</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Pending Auto-POs', value: '3', color: 'yellow' }, { label: 'Sent This Week', value: '8', color: 'blue' }, { label: 'Active Rules', value: '2', color: 'green' }, { label: 'Avg Savings vs Quote', value: '4.2%', color: 'indigo' }].map(k => (
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

      {tab === 'Auto-PO' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Item', 'Supplier', 'Qty', 'Unit Price', 'Total', 'Trigger', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{AUTO_PO.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.item}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.qty}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {p.unit_price}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">AED {p.total.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.trigger}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                <td className="px-4 py-3">{p.status === 'pending' && <button className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg">Approve</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Quote Compare' && (
        <div className="space-y-4">
          {QUOTES.map(q => (
            <div key={q.item} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">{q.item}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {q.quotes.sort((a, b) => a.price - b.price).map((sup, i) => (
                  <div key={sup.supplier} className={`rounded-lg border p-3 ${i === 0 ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                    {i === 0 && <p className="text-xs text-green-600 font-bold mb-1">Best Price</p>}
                    <p className="font-medium text-gray-900 text-sm">{sup.supplier}</p>
                    <p className="text-xl font-bold text-indigo-600 my-1">AED {sup.price}/kg</p>
                    <p className="text-xs text-gray-500">Delivery: {sup.delivery_days}d | Rating: {sup.rating}★</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Price History' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Item', 'Supplier', 'Jan', 'Feb', 'Mar', 'Apr', 'Trend'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{HISTORY.map(h => (
              <tr key={h.item} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{h.item}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{h.supplier}</td>
                {['jan','feb','mar','apr'].map(m => <td key={m} className="px-4 py-3 text-sm text-gray-700">AED {h[m]}</td>)}
                <td className="px-4 py-3"><span className={`text-xs font-medium ${h.trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>{h.trend === 'up' ? '↑ Rising' : '→ Stable'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Rules' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Item', 'Trigger', 'Threshold', 'Action', 'Preferred Supplier', 'Auto Qty', 'Active'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{RULES.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${!r.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.item}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.trigger_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.threshold}</td>
                <td className="px-4 py-3 text-sm">{r.action === 'auto_po' ? <span className="text-green-600 font-medium">Auto PO</span> : <span className="text-blue-600 font-medium">Notify Only</span>}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{r.preferred_supplier}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{r.qty}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{r.is_active ? 'Active' : 'Paused'}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
