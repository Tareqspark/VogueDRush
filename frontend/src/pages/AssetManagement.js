import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Registry', 'schedule': 'Maintenance Schedule', 'service': 'Service History', 'depreciation': 'Depreciation' };
const TAB_PATH = { 'Registry': '', 'Maintenance Schedule': 'schedule', 'Service History': 'service', 'Depreciation': 'depreciation' };

const ASSETS = [
  { id: 1, asset_code: 'AST-001', name: 'Commercial Oven', category: 'Kitchen Equipment', purchase_cost: 28000, current_value: 21000, status: 'active', warranty_expiry: '2026-03-15', location: 'Main Kitchen' },
  { id: 2, asset_code: 'AST-002', name: 'Industrial Refrigerator', category: 'Refrigeration', purchase_cost: 18500, current_value: 15200, status: 'active', warranty_expiry: '2025-08-20', location: 'Cold Room A' },
  { id: 3, asset_code: 'AST-003', name: 'POS Terminal #1', category: 'IT Equipment', purchase_cost: 4500, current_value: 2800, status: 'active', warranty_expiry: '2025-12-01', location: 'Front Desk' },
  { id: 4, asset_code: 'AST-004', name: 'Delivery Van', category: 'Vehicles', purchase_cost: 85000, current_value: 62000, status: 'under_maintenance', warranty_expiry: '2027-06-30', location: 'Parking' },
];

const SCHEDULE = [
  { id: 1, asset: 'Commercial Oven', maintenance_type: 'Preventive Service', scheduled_date: '2025-02-01', technician: 'Ali Hassan', cost: 500, status: 'scheduled' },
  { id: 2, asset: 'Industrial Refrigerator', maintenance_type: 'Filter Replacement', scheduled_date: '2025-01-28', technician: 'External Vendor', cost: 300, status: 'overdue' },
  { id: 3, asset: 'Delivery Van', maintenance_type: 'Oil Change & Service', scheduled_date: '2025-01-22', technician: 'Gulf Motors', cost: 800, status: 'in_progress' },
];

const SERVICE_LOGS = [
  { id: 1, asset: 'Commercial Oven', service_date: '2025-01-05', service_type: 'Preventive', technician: 'Ali Hassan', cost: 450, description: 'Cleaned burners, replaced igniter' },
  { id: 2, asset: 'POS Terminal #1', service_date: '2024-12-15', service_type: 'Repair', technician: 'IT Support', cost: 200, description: 'Replaced touchscreen' },
];

const DEPRECIATION = [
  { asset_code: 'AST-001', name: 'Commercial Oven', purchase_cost: 28000, useful_life: 10, method: 'Straight-Line', annual_dep: 2800, accumulated: 7000, book_value: 21000 },
  { asset_code: 'AST-002', name: 'Industrial Refrigerator', purchase_cost: 18500, useful_life: 8, method: 'Straight-Line', annual_dep: 2312, accumulated: 3300, book_value: 15200 },
  { asset_code: 'AST-004', name: 'Delivery Van', purchase_cost: 85000, useful_life: 7, method: 'Declining Balance', annual_dep: 12143, accumulated: 23000, book_value: 62000 },
];

const STATUS_COLORS = { active: 'bg-green-100 text-green-800', under_maintenance: 'bg-yellow-100 text-yellow-800', retired: 'bg-gray-100 text-gray-500', scheduled: 'bg-blue-100 text-blue-800', overdue: 'bg-red-100 text-red-800', in_progress: 'bg-yellow-100 text-yellow-800' };

export default function AssetManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/assets\/?/, '');
  const tab = PATH_MAP[subPath] || 'Registry';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/assets/${TAB_PATH[t]}` : '/assets');

  const totalValue = ASSETS.reduce((s, a) => s + a.current_value, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track equipment, vehicles and property assets</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Asset</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total Assets', value: ASSETS.length, color: 'blue' }, { label: 'Active', value: ASSETS.filter(a => a.status === 'active').length, color: 'green' }, { label: 'Total Book Value', value: `AED ${totalValue.toLocaleString()}`, color: 'indigo' }, { label: 'Under Maintenance', value: ASSETS.filter(a => a.status === 'under_maintenance').length, color: 'yellow' }].map(k => (
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

      {tab === 'Registry' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Code', 'Name', 'Category', 'Location', 'Purchase Cost', 'Book Value', 'Warranty', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{ASSETS.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{a.asset_code}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.category}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.location}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {a.purchase_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-indigo-600">AED {a.current_value.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{a.warranty_expiry}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Maintenance Schedule' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Asset', 'Type', 'Scheduled Date', 'Technician', 'Cost', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SCHEDULE.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.asset}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.maintenance_type}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.scheduled_date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.technician}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {s.cost}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status]}`}>{s.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Service History' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Asset', 'Date', 'Type', 'Technician', 'Cost', 'Description'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SERVICE_LOGS.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.asset}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.service_date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.service_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.technician}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-700">AED {s.cost}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{s.description}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Depreciation' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Asset', 'Purchase Cost', 'Useful Life', 'Method', 'Annual Dep.', 'Accumulated', 'Book Value'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{DEPRECIATION.map(d => (
              <tr key={d.asset_code} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {d.purchase_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.useful_life} yrs</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.method}</td>
                <td className="px-4 py-3 text-sm text-orange-600">AED {d.annual_dep.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {d.accumulated.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">AED {d.book_value.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
