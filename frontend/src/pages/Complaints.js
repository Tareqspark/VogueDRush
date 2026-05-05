import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Tickets', 'resolution': 'Resolution', 'compensation': 'Compensation', 'reports': 'Reports' };
const TAB_PATH = { 'Tickets': '', 'Resolution': 'resolution', 'Compensation': 'compensation', 'Reports': 'reports' };

const TICKETS = [
  { id: 1, ticket_ref: 'CMP-2025-0042', customer_name: 'Ahmed Al Nouri', phone: '+971501234567', subject: 'Cold food received on delivery', category: 'Food Quality', priority: 'high', status: 'open', assigned_to: 'Rania Hassan', created_at: '2025-01-20 14:30' },
  { id: 2, ticket_ref: 'CMP-2025-0041', customer_name: 'Sara Khalid', phone: '+971559876543', subject: 'Wrong order delivered', category: 'Wrong Order', priority: 'medium', status: 'in_progress', assigned_to: 'Mohamed Saad', created_at: '2025-01-20 12:15' },
  { id: 3, ticket_ref: 'CMP-2025-0040', customer_name: 'Omar Rashid', phone: '+971507654321', subject: 'Staff was rude to customer', category: 'Staff Behavior', priority: 'high', status: 'escalated', assigned_to: 'Manager', created_at: '2025-01-19 18:45' },
  { id: 4, ticket_ref: 'CMP-2025-0038', customer_name: 'Fatima Hassan', phone: '+971504321098', subject: 'Food was undercooked', category: 'Food Quality', priority: 'urgent', status: 'open', assigned_to: 'Unassigned', created_at: '2025-01-19 20:10' },
];

const RESOLVED = [
  { ticket_ref: 'CMP-2025-0035', subject: 'Incorrect bill charged', customer: 'Khalid S.', category: 'Billing', resolution: 'Full refund processed — AED 85 returned', resolved_by: 'Layla Ibrahim', resolution_time_hrs: 2.5, resolved_at: '2025-01-18' },
  { ticket_ref: 'CMP-2025-0033', subject: 'Long wait time at table', customer: 'Maria P.', category: 'Service Speed', resolution: 'Apologized and issued 15% discount voucher', resolved_by: 'Rania Hassan', resolution_time_hrs: 1.0, resolved_at: '2025-01-17' },
];

const COMPENSATIONS = [
  { ticket_ref: 'CMP-2025-0035', customer: 'Khalid S.', comp_type: 'Refund', amount: 85, issued_by: 'Admin', issued_at: '2025-01-18', notes: 'Full refund for incorrect billing' },
  { ticket_ref: 'CMP-2025-0033', customer: 'Maria P.', comp_type: 'Voucher', amount: null, issued_by: 'Rania Hassan', issued_at: '2025-01-17', notes: '15% discount voucher code: SORRY2025' },
];

const CATEGORY_STATS = [
  { category: 'Food Quality', count: 12, avg_resolution_hrs: 3.2, compensation_issued: 4 },
  { category: 'Wrong Order', count: 8, avg_resolution_hrs: 1.5, compensation_issued: 7 },
  { category: 'Staff Behavior', count: 3, avg_resolution_hrs: 6.0, compensation_issued: 2 },
  { category: 'Billing', count: 5, avg_resolution_hrs: 2.0, compensation_issued: 5 },
  { category: 'Service Speed', count: 9, avg_resolution_hrs: 1.8, compensation_issued: 3 },
];

const PRIORITY_COLORS = { urgent: 'bg-red-200 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-500' };
const STATUS_COLORS = { open: 'bg-blue-100 text-blue-700', in_progress: 'bg-indigo-100 text-indigo-700', escalated: 'bg-red-100 text-red-800', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500' };

export default function Complaints() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/complaints\/?/, '');
  const tab = PATH_MAP[subPath] || 'Tickets';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/complaints/${TAB_PATH[t]}` : '/complaints');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complaint Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track, resolve, and report all customer complaints</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Ticket</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Open Tickets', value: TICKETS.filter(t => t.status === 'open').length, color: 'blue' }, { label: 'Escalated', value: TICKETS.filter(t => t.status === 'escalated').length, color: 'red' }, { label: 'Resolved (30d)', value: RESOLVED.length, color: 'green' }, { label: 'Avg Resolution', value: '2.8 hrs', color: 'indigo' }].map(k => (
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

      {tab === 'Tickets' && (
        <div className="space-y-3">{TICKETS.map(t => (
          <div key={t.id} className={`bg-white rounded-xl shadow-sm border p-4 ${t.status === 'escalated' ? 'border-red-200' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-indigo-600">{t.ticket_ref}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace('_', ' ')}</span>
                  </div>
                  <p className="font-medium text-gray-900">{t.subject}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{t.customer_name} · {t.phone}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Category: {t.category} · Assigned: {t.assigned_to}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{t.created_at}</p>
                <button className="mt-2 text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">Resolve</button>
              </div>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Resolution' && (
        <div className="space-y-3">{RESOLVED.map(r => (
          <div key={r.ticket_ref} className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono text-indigo-600">{r.ticket_ref}</span>
                  <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{r.category}</span>
                </div>
                <p className="font-medium text-gray-900">{r.subject}</p>
                <p className="text-sm text-gray-600 mt-1">Resolution: {r.resolution}</p>
                <p className="text-xs text-gray-500 mt-0.5">Resolved by: {r.resolved_by} · {r.resolved_at}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">{r.resolution_time_hrs}h</p>
                <p className="text-xs text-gray-400">resolution time</p>
              </div>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Compensation' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Ticket', 'Customer', 'Type', 'Amount', 'Issued By', 'Date', 'Notes'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{COMPENSATIONS.map(c => (
              <tr key={c.ticket_ref} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-indigo-600">{c.ticket_ref}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{c.customer}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.comp_type}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">{c.amount ? `AED ${c.amount}` : '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.issued_by}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.issued_at}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.notes}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Category', 'Total Tickets', 'Avg Resolution (hrs)', 'Compensations Issued'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{CATEGORY_STATS.map(s => (
              <tr key={s.category} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.category}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.count}</td>
                <td className="px-4 py-3 text-sm text-indigo-600">{s.avg_resolution_hrs}h</td>
                <td className="px-4 py-3 text-sm text-green-600">{s.compensation_issued}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
