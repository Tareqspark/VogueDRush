import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Live Queue', 'display': 'Display Screen', 'history': 'History', 'settings': 'Settings' };
const TAB_PATH = { 'Live Queue': '', 'Display Screen': 'display', 'History': 'history', 'Settings': 'settings' };

const QUEUE = [
  { token: 'T024', service: 'Dine-In', name: 'Ahmed M.', phone: '+971501234567', party_size: 4, wait_minutes: 8, status: 'waiting', issued_at: '14:35' },
  { token: 'T025', service: 'Dine-In', name: 'Sara K.', phone: '+971559876543', party_size: 2, wait_minutes: 18, status: 'waiting', issued_at: '14:38' },
  { token: 'T026', service: 'Takeaway', name: 'Omar N.', phone: '+971507654321', party_size: 1, wait_minutes: 25, status: 'waiting', issued_at: '14:42' },
  { token: 'T027', service: 'Dine-In', name: 'Fatima A.', phone: '+971504321098', party_size: 6, wait_minutes: 32, status: 'waiting', issued_at: '14:45' },
];

const HISTORY = [
  { token: 'T020', service: 'Dine-In', name: 'Khalid S.', party_size: 3, issued_at: '13:10', served_at: '13:18', completed_at: '14:45', wait_time: 8 },
  { token: 'T021', service: 'Takeaway', name: 'Maria P.', party_size: 1, issued_at: '13:22', served_at: '13:28', completed_at: '13:45', wait_time: 6 },
  { token: 'T022', service: 'Dine-In', name: 'Hassan R.', party_size: 5, issued_at: '13:45', served_at: '13:50', completed_at: '15:10', wait_time: 5 },
  { token: 'T023', service: 'Dine-In', name: 'Nour Al-H.', party_size: 2, issued_at: '14:15', served_at: '14:25', completed_at: '15:30', wait_time: 10 },
];

const SERVICE_TYPES = [
  { name: 'Dine-In', avg_wait: '10 min', max_queue: 20, current: 3, status: 'active' },
  { name: 'Takeaway', avg_wait: '5 min', max_queue: 10, current: 1, status: 'active' },
  { name: 'Delivery Pickup', avg_wait: '3 min', max_queue: 5, current: 0, status: 'active' },
  { name: 'VIP Lounge', avg_wait: '0 min', max_queue: 5, current: 0, status: 'active' },
];

const CURRENT_SERVING = 'T023';

export default function QueueManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/queue\/?/, '');
  const tab = PATH_MAP[subPath] || 'Live Queue';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/queue/${TAB_PATH[t]}` : '/queue');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time queue tracking for dine-in, takeaway and delivery</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50">Issue Token</button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Call Next</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Currently Waiting', value: QUEUE.length, color: 'blue' }, { label: 'Now Serving', value: CURRENT_SERVING, color: 'green' }, { label: 'Avg Wait Today', value: '8 min', color: 'indigo' }, { label: 'Served Today', value: HISTORY.length, color: 'gray' }].map(k => (
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

      {tab === 'Live Queue' && (
        <div className="space-y-3">{QUEUE.map((q, i) => (
          <div key={q.token} className={`bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center ${i === 0 ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{q.token}</div>
              <div>
                <p className="font-medium text-gray-900">{q.name} · Party of {q.party_size}</p>
                <p className="text-sm text-gray-500">{q.service} · Issued {q.issued_at}</p>
                <p className="text-xs text-orange-600 mt-0.5">Wait: ~{q.wait_minutes} min</p>
              </div>
            </div>
            {i === 0 && <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Seat Now</button>}
          </div>
        ))}</div>
      )}

      {tab === 'Display Screen' && (
        <div className="bg-gray-900 rounded-2xl p-10 text-center text-white">
          <p className="text-lg text-gray-400 mb-2">NOW SERVING</p>
          <div className="text-8xl font-black text-indigo-400 mb-4">{CURRENT_SERVING}</div>
          <p className="text-2xl text-gray-300 mb-10">Please proceed to the host desk</p>
          <div className="border-t border-gray-700 pt-8">
            <p className="text-sm text-gray-500 mb-4">NEXT IN QUEUE</p>
            <div className="flex justify-center gap-6">{QUEUE.slice(0, 5).map(q => (
              <div key={q.token} className="text-center">
                <div className="text-3xl font-bold text-gray-300">{q.token}</div>
                <div className="text-xs text-gray-500 mt-1">{q.service}</div>
              </div>
            ))}</div>
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Token', 'Service', 'Name', 'Party', 'Issued', 'Seated', 'Completed', 'Wait (min)'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{HISTORY.map(h => (
              <tr key={h.token} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{h.token}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{h.service}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{h.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{h.party_size}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{h.issued_at}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{h.served_at}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{h.completed_at}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-600">{h.wait_time}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{SERVICE_TYPES.map(s => (
          <div key={s.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-gray-900">{s.name}</h3>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s.status}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Avg Wait</span><span className="font-medium">{s.avg_wait}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Max Queue</span><span className="font-medium">{s.max_queue} tokens</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Current</span><span className="font-bold text-indigo-600">{s.current} waiting</span></div>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
