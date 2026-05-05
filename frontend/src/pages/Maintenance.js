import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Open Tickets', 'logs': 'Logs', 'preventive': 'Preventive', 'technicians': 'Technicians' };
const TAB_PATH = { 'Open Tickets': '', 'Logs': 'logs', 'Preventive': 'preventive', 'Technicians': 'technicians' };

const TICKETS = [
  { id: 1, ticket_number: 'TKT-8X2A1', asset: 'Commercial Oven', issue: 'Burner ignition failing', priority: 'high', status: 'open', reported_by: 'Chef Ali', opened_at: '2025-01-20 08:30', sla: '24h' },
  { id: 2, ticket_number: 'TKT-9B3C2', asset: 'Delivery Van', issue: 'AC system not cooling', priority: 'medium', status: 'assigned', reported_by: 'Ahmed K.', opened_at: '2025-01-19 14:00', sla: '48h' },
  { id: 3, ticket_number: 'TKT-7D4E3', asset: 'POS Terminal #2', issue: 'Printer not responding', priority: 'low', status: 'resolved', reported_by: 'Sara M.', opened_at: '2025-01-18 10:00', sla: '72h' },
];

const LOGS = [
  { id: 1, ticket: 'TKT-8X2A1', action: 'Inspected burner assembly', technician: 'Ali Hassan', time_spent: 45, cost: 0, notes: 'Requires new igniter part', logged_at: '2025-01-20 10:15' },
  { id: 2, ticket: 'TKT-9B3C2', action: 'Diagnosed AC compressor', technician: 'Gulf Motors', time_spent: 90, cost: 200, notes: 'Compressor valve leaking, ordered part', logged_at: '2025-01-19 16:30' },
  { id: 3, ticket: 'TKT-7D4E3', action: 'Replaced printer cable', technician: 'IT Support', time_spent: 20, cost: 50, notes: 'Issue resolved', logged_at: '2025-01-18 11:30' },
];

const PREVENTIVE = [
  { asset: 'Commercial Oven', frequency: 'Monthly', next_due: '2025-02-01', last_done: '2025-01-01', status: 'upcoming' },
  { asset: 'Refrigerator Units', frequency: 'Quarterly', next_due: '2025-02-15', last_done: '2024-11-15', status: 'upcoming' },
  { asset: 'Delivery Van', frequency: 'Every 5000 km', next_due: '2025-01-22', last_done: '2024-12-10', status: 'overdue' },
  { asset: 'Fire Suppression System', frequency: 'Annual', next_due: '2025-06-01', last_done: '2024-06-01', status: 'ok' },
];

const TECHS = [
  { name: 'Ali Hassan', specialization: 'Kitchen Equipment', open_tickets: 1, resolved_30d: 8, avg_resolution: '18h', rating: 4.8 },
  { name: 'Gulf Motors (External)', specialization: 'Vehicles', open_tickets: 1, resolved_30d: 3, avg_resolution: '36h', rating: 4.5 },
  { name: 'IT Support Team', specialization: 'IT Equipment', open_tickets: 0, resolved_30d: 5, avg_resolution: '12h', rating: 4.9 },
];

const P_COLORS = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-600' };
const S_COLORS = { open: 'bg-red-100 text-red-700', assigned: 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700' };
const PREV_COLORS = { overdue: 'bg-red-100 text-red-700', upcoming: 'bg-yellow-100 text-yellow-700', ok: 'bg-green-100 text-green-700' };

export default function Maintenance() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/maintenance\/?/, '');
  const tab = PATH_MAP[subPath] || 'Open Tickets';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/maintenance/${TAB_PATH[t]}` : '/maintenance');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track repair tickets, preventive maintenance and technicians</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Ticket</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Open Tickets', value: '2', color: 'red' }, { label: 'Resolved (30d)', value: '16', color: 'green' }, { label: 'Overdue PM', value: '1', color: 'orange' }, { label: 'Avg Resolution', value: '22h', color: 'blue' }].map(k => (
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

      {tab === 'Open Tickets' && (
        <div className="space-y-3">{TICKETS.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">{t.ticket_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${P_COLORS[t.priority]}`}>{t.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${S_COLORS[t.status]}`}>{t.status}</span>
                </div>
                <p className="font-medium text-gray-900">{t.issue}</p>
                <p className="text-sm text-gray-500 mt-1">Asset: {t.asset} | Reported by: {t.reported_by} | SLA: {t.sla}</p>
              </div>
              <p className="text-xs text-gray-400">{t.opened_at}</p>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Logs' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Ticket', 'Action', 'Technician', 'Time Spent', 'Cost', 'Notes', 'Logged At'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{LOGS.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.ticket}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{l.action}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{l.technician}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{l.time_spent} min</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {l.cost}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{l.notes}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{l.logged_at}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Preventive' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Asset', 'Frequency', 'Next Due', 'Last Done', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{PREVENTIVE.map(p => (
              <tr key={p.asset} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.asset}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.frequency}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{p.next_due}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.last_done}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${PREV_COLORS[p.status]}`}>{p.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Technicians' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{TECHS.map(t => (
          <div key={t.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.specialization}</p>
              </div>
              <span className="text-sm font-bold text-yellow-500">{t.rating}★</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Open</p><p className="text-lg font-bold text-gray-900">{t.open_tickets}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Resolved</p><p className="text-lg font-bold text-green-600">{t.resolved_30d}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Avg Time</p><p className="text-lg font-bold text-blue-600">{t.avg_resolution}</p></div>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
