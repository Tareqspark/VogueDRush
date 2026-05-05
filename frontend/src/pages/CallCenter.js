import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Agent Dashboard', 'logs': 'Call Logs', 'customers': 'Customers', 'quick-order': 'Quick Order' };
const TAB_PATH = { 'Agent Dashboard': '', 'Call Logs': 'logs', 'Customers': 'customers', 'Quick Order': 'quick-order' };

const AGENTS = [
  { name: 'Rania Hassan', status: 'on-call', calls_today: 34, avg_duration: '3:42', orders_placed: 18, resolution_rate: 94 },
  { name: 'Mohamed Saad', status: 'available', calls_today: 28, avg_duration: '4:10', orders_placed: 14, resolution_rate: 89 },
  { name: 'Layla Ibrahim', status: 'break', calls_today: 21, avg_duration: '3:55', orders_placed: 11, resolution_rate: 91 },
];

const CALL_LOGS = [
  { id: 1, phone: '+971501234567', customer_name: 'Ahmed Al Nouri', agent: 'Rania Hassan', duration: '4:23', outcome: 'order_placed', order_id: 'ORD-8821', call_time: '14:35', notes: 'Table booking for 6 persons' },
  { id: 2, phone: '+971559876543', customer_name: 'Unknown', agent: 'Mohamed Saad', duration: '1:15', outcome: 'inquiry', order_id: null, call_time: '14:22', notes: 'Menu question' },
  { id: 3, phone: '+971504567890', customer_name: 'Sara Al Marzouqi', agent: 'Layla Ibrahim', duration: '5:40', outcome: 'complaint', order_id: 'ORD-8790', call_time: '13:58', notes: 'Cold food received' },
  { id: 4, phone: '+971507654321', customer_name: 'Omar Khalid', agent: 'Rania Hassan', duration: '2:50', outcome: 'order_placed', order_id: 'ORD-8819', call_time: '13:41', notes: 'Delivery order — 3 mains' },
];

const CUSTOMERS = [
  { id: 1, phone: '+971501234567', name: 'Ahmed Al Nouri', address: 'Al Barsha, Dubai', total_orders: 28, last_order: '2025-01-20', preferred_items: 'Chicken Biryani, Lamb Kebab', notes: 'Prefers extra sauce' },
  { id: 2, phone: '+971504567890', name: 'Sara Al Marzouqi', address: 'Jumeirah, Dubai', total_orders: 14, last_order: '2025-01-18', preferred_items: 'Grilled Fish, Salad', notes: 'Lactose intolerant' },
  { id: 3, phone: '+971507654321', name: 'Omar Khalid', address: 'Deira, Dubai', total_orders: 42, last_order: '2025-01-20', preferred_items: 'Mixed Grill Platter', notes: 'VIP customer — priority service' },
];

const OUTCOME_COLORS = { order_placed: 'bg-green-100 text-green-700', inquiry: 'bg-blue-100 text-blue-700', complaint: 'bg-red-100 text-red-700', missed: 'bg-gray-100 text-gray-500' };
const STATUS_COLORS = { 'on-call': 'bg-red-100 text-red-700', available: 'bg-green-100 text-green-700', break: 'bg-yellow-100 text-yellow-700' };

export default function CallCenter() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/call-center\/?/, '');
  const tab = PATH_MAP[subPath] || 'Agent Dashboard';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/call-center/${TAB_PATH[t]}` : '/call-center');

  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ phone: '', name: '', items: '', notes: '' });

  const filteredCustomers = CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Center</h1>
        <p className="text-sm text-gray-500 mt-1">Phone-based order management and customer support</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Calls Today', value: CALL_LOGS.length, color: 'blue' }, { label: 'Orders via Phone', value: CALL_LOGS.filter(c => c.outcome === 'order_placed').length, color: 'green' }, { label: 'Complaints', value: CALL_LOGS.filter(c => c.outcome === 'complaint').length, color: 'red' }, { label: 'Active Agents', value: AGENTS.filter(a => a.status !== 'break').length, color: 'indigo' }].map(k => (
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

      {tab === 'Agent Dashboard' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Agent', 'Status', 'Calls Today', 'Avg Duration', 'Orders Placed', 'Resolution Rate'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{AGENTS.map(a => (
              <tr key={a.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{a.calls_today}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{a.avg_duration}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">{a.orders_placed}</td>
                <td className="px-4 py-3 text-sm text-indigo-600">{a.resolution_rate}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Call Logs' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Phone', 'Customer', 'Agent', 'Duration', 'Outcome', 'Order', 'Time', 'Notes'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{CALL_LOGS.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{c.phone}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.customer_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.agent}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.duration}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[c.outcome]}`}>{c.outcome.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-sm text-indigo-600">{c.order_id || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{c.call_time}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.notes}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Customers' && (
        <div className="space-y-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
          <div className="space-y-3">{filteredCustomers.map(c => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.phone} · {c.address}</p>
                  <p className="text-xs text-gray-400 mt-1">Favorites: {c.preferred_items}</p>
                  {c.notes && <p className="text-xs text-indigo-600 mt-0.5">Note: {c.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">{c.total_orders}</p>
                  <p className="text-xs text-gray-400">orders</p>
                </div>
              </div>
            </div>
          ))}</div>
        </div>
      )}

      {tab === 'Quick Order' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
          <h2 className="font-semibold text-gray-900 mb-4">Place Phone Order</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="+971 5X XXX XXXX" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Full name" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Order Items</label>
              <textarea value={form.items} onChange={e => setForm({...form, items: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Chicken Biryani x2, Lamb Kebab x1..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address / Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Address or special instructions" /></div>
            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Place Order</button>
          </div>
        </div>
      )}
    </div>
  );
}
