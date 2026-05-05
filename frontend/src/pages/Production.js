import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Plan Overview', 'batches': 'Batch Sheets', 'semi-finished': 'Semi-Finished', 'wastage': 'Wastage', 'dispatch': 'Dispatch' };
const TAB_PATH = { 'Plan Overview': '', 'Batch Sheets': 'batches', 'Semi-Finished': 'semi-finished', 'Wastage': 'wastage', 'Dispatch': 'dispatch' };

const PLANS = [
  { id: 1, plan_date: '2025-01-20', branch: 'Main Kitchen', items: 'Chicken Biryani x200, Grilled Fish x80', status: 'in_progress', planned_by: 'Chef Ali' },
  { id: 2, plan_date: '2025-01-21', branch: 'Main Kitchen', items: 'Lamb Curry x150, Vegetable Rice x100', status: 'pending', planned_by: 'Chef Sara' },
  { id: 3, plan_date: '2025-01-22', branch: 'Branch B', items: 'Mixed Grill x120', status: 'completed', planned_by: 'Chef Omar' },
];

const BATCHES = [
  { id: 1, batch_code: 'BAT-0120-001', plan_id: 1, item: 'Chicken Biryani', quantity: 200, unit: 'portions', start_time: '06:00', status: 'in_progress' },
  { id: 2, batch_code: 'BAT-0120-002', plan_id: 1, item: 'Grilled Fish', quantity: 80, unit: 'portions', start_time: '07:00', status: 'pending' },
  { id: 3, batch_code: 'BAT-0121-001', plan_id: 2, item: 'Lamb Curry', quantity: 150, unit: 'portions', start_time: '06:30', status: 'pending' },
];

const SEMI = [
  { id: 1, name: 'Marinated Chicken', quantity: 50, unit: 'kg', prepared_date: '2025-01-19', expiry_date: '2025-01-22', location: 'Cold Room A' },
  { id: 2, name: 'Spice Blend Mix', quantity: 20, unit: 'kg', prepared_date: '2025-01-19', expiry_date: '2025-01-26', location: 'Dry Store' },
];

const WASTAGE = [
  { id: 1, wastage_date: '2025-01-19', item: 'Vegetables', quantity: 5, unit: 'kg', reason: 'Over-preparation', cost: 150, recorded_by: 'Chef Ali' },
  { id: 2, wastage_date: '2025-01-19', item: 'Bread', quantity: 30, unit: 'pieces', reason: 'Expired', cost: 90, recorded_by: 'Chef Sara' },
];

const DISPATCHES = [
  { id: 1, dispatch_date: '2025-01-20', destination: 'Branch B', items: 'Lamb Curry x50', status: 'in_transit', driver: 'Ahmed K.' },
  { id: 2, dispatch_date: '2025-01-19', destination: 'Branch C', items: 'Dessert Mix x30', status: 'delivered', driver: 'Khalid M.' },
];

const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-800', in_progress: 'bg-blue-100 text-blue-800', completed: 'bg-green-100 text-green-800', in_transit: 'bg-purple-100 text-purple-800', delivered: 'bg-green-100 text-green-800' };

export default function Production() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/production\/?/, '');
  const tab = PATH_MAP[subPath] || 'Plan Overview';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/production/${TAB_PATH[t]}` : '/production');
  const [showForm, setShowForm] = useState(false);

  const tabs = Object.keys(TAB_PATH);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Planning</h1>
          <p className="text-sm text-gray-500 mt-1">Manage kitchen production plans, batch sheets and dispatch</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Plan</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Plans', value: '3', color: 'blue' }, { label: 'Running Batches', value: '1', color: 'yellow' }, { label: 'Wastage Today', value: 'AED 240', color: 'red' }, { label: 'Dispatches Today', value: '2', color: 'green' }].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold text-${k.color}-600 mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {/* Tab: Plan Overview */}
      {tab === 'Plan Overview' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Date', 'Branch', 'Items', 'Planned By', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{PLANS.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{p.plan_date}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.branch}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{p.items}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.planned_by}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status.replace('_', ' ')}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Tab: Batch Sheets */}
      {tab === 'Batch Sheets' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Batch Code', 'Item', 'Qty', 'Start Time', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{BATCHES.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{b.batch_code}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.item}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.quantity} {b.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.start_time}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>{b.status.replace('_', ' ')}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Tab: Semi-Finished */}
      {tab === 'Semi-Finished' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Name', 'Quantity', 'Prepared', 'Expires', 'Location'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SEMI.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.quantity} {s.unit}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.prepared_date}</td>
                <td className="px-4 py-3 text-sm text-red-600">{s.expiry_date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.location}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Tab: Wastage */}
      {tab === 'Wastage' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-700">Total Wastage Cost Today: <span className="font-bold">AED 240</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>{['Date', 'Item', 'Quantity', 'Reason', 'Cost', 'Recorded By'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">{WASTAGE.map(w => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{w.wastage_date}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.item}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{w.quantity} {w.unit}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{w.reason}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">AED {w.cost}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{w.recorded_by}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Dispatch */}
      {tab === 'Dispatch' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Date', 'Destination', 'Items', 'Driver', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{DISPATCHES.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700">{d.dispatch_date}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.destination}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.items}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{d.driver}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status.replace('_', ' ')}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
