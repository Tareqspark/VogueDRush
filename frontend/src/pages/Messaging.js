import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Inbox', 'threads': 'Threads', 'announcements': 'Announcements', 'compose': 'Compose' };
const TAB_PATH = { 'Inbox': '', 'Threads': 'threads', 'Announcements': 'announcements', 'Compose': 'compose' };

const THREADS = [
  { id: 1, subject: 'Re: Inventory shortage — Basmati Rice', last_message: 'Chef Faris: We\'ll need at least 50kg before Friday service.', participants: ['admin', 'chef', 'procurement'], unread: 2, last_at: '14:45', is_announcement: false },
  { id: 2, subject: 'VIP Event — Jan 28 Setup', last_message: 'Manager: Confirm table arrangement by EOD.', participants: ['manager', 'floor', 'kitchen'], unread: 0, last_at: '12:30', is_announcement: false },
  { id: 3, subject: 'Shift Coverage Request — Fri Dinner', last_message: 'HR: Anyone available to cover 6pm–midnight?', participants: ['hr', 'staff'], unread: 1, last_at: '11:15', is_announcement: false },
  { id: 4, subject: 'New Health & Safety Policy', last_message: 'Admin: Please read and acknowledge by Jan 25.', participants: ['all'], unread: 5, last_at: 'Yesterday', is_announcement: true },
];

const MESSAGES = {
  1: [
    { sender: 'Procurement Lead', role: 'procurement', message: 'We\'re running low on Basmati Rice — only 45kg left.', sent_at: '10:30' },
    { sender: 'Chef Faris', role: 'kitchen', message: 'This weekend demand is higher than usual due to the event.', sent_at: '11:15' },
    { sender: 'Chef Faris', role: 'kitchen', message: 'We\'ll need at least 50kg before Friday service.', sent_at: '14:45' },
  ],
};

const ANNOUNCEMENTS = [
  { id: 1, title: 'New Health & Safety Policy — Mandatory Read', body: 'All staff must review the updated fire evacuation procedure and food handling guidelines. Acknowledgement required by January 25.', sender: 'Admin', sent_at: '2025-01-19 09:00', read_count: 12, total_staff: 34 },
  { id: 2, title: 'Ramadan Operating Hours 2025', body: 'Effective March 1, operating hours will shift to 11am–3pm and 7pm–2am. Kitchen prep starts 2 hours earlier.', sender: 'Manager', sent_at: '2025-01-15 14:00', read_count: 28, total_staff: 34 },
];

const ROLE_COLORS = { admin: 'bg-indigo-100 text-indigo-700', kitchen: 'bg-orange-100 text-orange-700', procurement: 'bg-blue-100 text-blue-700', hr: 'bg-purple-100 text-purple-700', manager: 'bg-gray-100 text-gray-700' };

export default function Messaging() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/messaging\/?/, '');
  const tab = PATH_MAP[subPath] || 'Inbox';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/messaging/${TAB_PATH[t]}` : '/messaging');

  const [form, setForm] = useState({ subject: '', recipient_role: '', message: '' });
  const [activeThread, setActiveThread] = useState(null);
  const [reply, setReply] = useState('');

  const totalUnread = THREADS.reduce((s, t) => s + t.unread, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internal Messaging</h1>
          <p className="text-sm text-gray-500 mt-1">Team communication, threads and announcements</p>
        </div>
        <button onClick={() => setTab('Compose')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Message</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Unread Messages', value: totalUnread, color: 'red' }, { label: 'Active Threads', value: THREADS.filter(t => !t.is_announcement).length, color: 'blue' }, { label: 'Announcements', value: ANNOUNCEMENTS.length, color: 'indigo' }, { label: 'Staff Online', value: '8', color: 'green' }].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold text-${k.color}-600 mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {Object.keys(TAB_PATH).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}{t === 'Inbox' && totalUnread > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{totalUnread}</span>}</button>
          ))}
        </nav>
      </div>

      {(tab === 'Inbox' || tab === 'Threads') && (
        <div className="flex gap-4">
          <div className="w-1/2 space-y-2">
            {THREADS.filter(t => tab === 'Threads' ? true : t.unread > 0 || true).map(t => (
              <div key={t.id} onClick={() => setActiveThread(t.id)} className={`bg-white rounded-xl border p-4 cursor-pointer hover:bg-indigo-50 transition-colors ${activeThread === t.id ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-gray-100'} ${t.is_announcement ? 'border-l-4 border-l-yellow-400' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium text-gray-900">{t.subject}</p>
                  {t.unread > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">{t.unread}</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{t.last_message}</p>
                <p className="text-xs text-gray-400 mt-1">{t.last_at}</p>
              </div>
            ))}
          </div>
          <div className="flex-1 bg-white rounded-xl border border-gray-100 flex flex-col">
            {activeThread ? (
              <>
                <div className="p-4 border-b border-gray-100">
                  <p className="font-medium text-gray-900">{THREADS.find(t => t.id === activeThread)?.subject}</p>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-auto">
                  {(MESSAGES[activeThread] || []).map((m, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[m.role] || 'bg-gray-100 text-gray-700'}`}>{m.sender}</span>
                      <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-800">{m.message}</div>
                      <span className="text-xs text-gray-400 shrink-0">{m.sent_at}</span>
                    </div>
                  ))}
                  {!(MESSAGES[activeThread]?.length) && <p className="text-sm text-gray-400 text-center py-8">No messages in this thread yet.</p>}
                </div>
                <div className="p-4 border-t border-gray-100 flex gap-2">
                  <input value={reply} onChange={e => setReply(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Type a reply..." />
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Send</button>
                </div>
              </>
            ) : <p className="text-sm text-gray-400 text-center py-16">Select a thread to view messages</p>}
          </div>
        </div>
      )}

      {tab === 'Announcements' && (
        <div className="space-y-4">{ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-yellow-200 p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-lg">📢</span>
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
              </div>
              <span className="text-xs text-gray-400">{a.sent_at}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{a.body}</p>
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">By: {a.sender} · Read by {a.read_count}/{a.total_staff} staff</p>
              <div className="w-32 bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(a.read_count / a.total_staff) * 100}%` }}></div>
              </div>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Compose' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
          <h2 className="font-semibold text-gray-900 mb-4">New Message</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">To (Team / Role)</label>
              <select value={form.recipient_role} onChange={e => setForm({...form, recipient_role: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">Select recipient...</option>
                <option value="all">All Staff</option>
                <option value="kitchen">Kitchen Team</option>
                <option value="floor">Floor Staff</option>
                <option value="management">Management</option>
                <option value="procurement">Procurement</option>
                <option value="hr">HR</option>
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Message subject..." /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Write your message..." /></div>
            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Send Message</button>
          </div>
        </div>
      )}
    </div>
  );
}
