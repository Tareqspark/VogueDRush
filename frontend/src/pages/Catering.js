import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Events', 'packages': 'Packages', 'logistics': 'Logistics', 'profitability': 'Profitability' };
const TAB_PATH = { 'Events': '', 'Packages': 'packages', 'Logistics': 'logistics', 'Profitability': 'profitability' };

const EVENTS = [
  { id: 1, event_name: 'Al Rashidi Wedding', client_name: 'Rashidi Family', event_date: '2025-02-15', guest_count: 350, total_amount: 42000, advance_paid: 20000, venue: 'Grand Hall', status: 'confirmed' },
  { id: 2, event_name: 'Corporate Luncheon', client_name: 'TechCorp UAE', event_date: '2025-01-28', guest_count: 80, total_amount: 8500, advance_paid: 4000, venue: 'Banquet Room B', status: 'in_progress' },
  { id: 3, event_name: 'National Day Gala', client_name: 'Ministry of Culture', event_date: '2025-12-02', guest_count: 500, total_amount: 85000, advance_paid: 40000, venue: 'Main Arena', status: 'inquiry' },
];

const PACKAGES = [
  { id: 1, name: 'Silver Package', price_per_head: 85, min_guests: 50, max_guests: 200, includes_setup: true, includes_service: true, description: 'Buffet-style, 3 main courses, dessert station' },
  { id: 2, name: 'Gold Package', price_per_head: 150, min_guests: 100, max_guests: 500, includes_setup: true, includes_service: true, description: 'Plated service, 5 courses, beverages, entertainment' },
  { id: 3, name: 'Platinum Package', price_per_head: 250, min_guests: 200, max_guests: 1000, includes_setup: true, includes_service: true, description: 'Full white-glove service, international cuisine, live station' },
];

const LOGISTICS = [
  { event: 'Al Rashidi Wedding', task: 'Equipment Delivery', assigned_to: 'Logistics Team', due_date: '2025-02-14', status: 'scheduled' },
  { event: 'Al Rashidi Wedding', task: 'Staff Briefing', assigned_to: 'Event Manager', due_date: '2025-02-14', status: 'pending' },
  { event: 'Corporate Luncheon', task: 'Food Preparation', assigned_to: 'Kitchen Team', due_date: '2025-01-28', status: 'in_progress' },
];

const PROFITABILITY = EVENTS.filter(e => e.advance_paid > 0).map(e => ({
  event: e.event_name, revenue: e.total_amount, food_cost: Math.round(e.total_amount * 0.28), staff_cost: Math.round(e.total_amount * 0.15), venue_cost: Math.round(e.total_amount * 0.1), profit: Math.round(e.total_amount * 0.47)
}));

const STATUS_COLORS = { confirmed: 'bg-green-100 text-green-800', in_progress: 'bg-blue-100 text-blue-800', inquiry: 'bg-yellow-100 text-yellow-800', scheduled: 'bg-blue-100 text-blue-700', pending: 'bg-gray-100 text-gray-600' };

export default function Catering() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/catering\/?/, '');
  const tab = PATH_MAP[subPath] || 'Events';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/catering/${TAB_PATH[t]}` : '/catering');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catering Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage catering events, packages and profitability</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Event</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Events', value: EVENTS.filter(e => e.status !== 'inquiry').length, color: 'blue' }, { label: 'Revenue (Upcoming)', value: `AED ${EVENTS.reduce((s,e) => s + e.total_amount, 0).toLocaleString()}`, color: 'green' }, { label: 'Advance Collected', value: `AED ${EVENTS.reduce((s,e) => s + e.advance_paid, 0).toLocaleString()}`, color: 'indigo' }, { label: 'Total Guests', value: EVENTS.reduce((s,e) => s + e.guest_count, 0).toLocaleString(), color: 'purple' }].map(k => (
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

      {tab === 'Events' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Event', 'Client', 'Date', 'Guests', 'Total', 'Advance', 'Venue', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{EVENTS.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.event_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{e.client_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{e.event_date}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{e.guest_count}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">AED {e.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-green-600">AED {e.advance_paid.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{e.venue}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Packages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{PACKAGES.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
            <p className="text-3xl font-bold text-indigo-600 my-2">AED {p.price_per_head}<span className="text-sm font-normal text-gray-500">/head</span></p>
            <p className="text-sm text-gray-600 mb-3">{p.description}</p>
            <div className="space-y-1 text-sm">
              <p className="text-gray-500">Guests: {p.min_guests} – {p.max_guests}</p>
              {p.includes_setup && <p className="text-green-600">✓ Setup included</p>}
              {p.includes_service && <p className="text-green-600">✓ Service staff included</p>}
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Logistics' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Event', 'Task', 'Assigned To', 'Due Date', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{LOGISTICS.map((l, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.event}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{l.task}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{l.assigned_to}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{l.due_date}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Profitability' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Event', 'Revenue', 'Food Cost', 'Staff Cost', 'Venue Cost', 'Profit', 'Margin'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{PROFITABILITY.map(p => (
              <tr key={p.event} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.event}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {p.revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {p.food_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {p.staff_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {p.venue_cost.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">AED {p.profit.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{((p.profit / p.revenue) * 100).toFixed(1)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
