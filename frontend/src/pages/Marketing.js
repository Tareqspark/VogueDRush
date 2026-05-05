import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Campaigns', 'segments': 'Segments', 'automation': 'Automation', 'logs': 'Logs' };
const TAB_PATH = { 'Campaigns': '', 'Segments': 'segments', 'Automation': 'automation', 'Logs': 'logs' };

const CAMPAIGNS = [
  { id: 1, name: 'Ramadan Special', campaign_type: 'SMS', trigger_type: 'scheduled', status: 'completed', sent_count: 4820, delivered_count: 4650, opened_count: 1240, scheduled_at: '2025-01-15 09:00' },
  { id: 2, name: 'Weekend Brunch Promo', campaign_type: 'Email', trigger_type: 'manual', status: 'running', sent_count: 1200, delivered_count: 1150, opened_count: 340, scheduled_at: '2025-01-20 10:00' },
  { id: 3, name: 'Loyalty Re-engagement', campaign_type: 'WhatsApp', trigger_type: 'automated', status: 'draft', sent_count: 0, delivered_count: 0, opened_count: 0, scheduled_at: null },
  { id: 4, name: 'New Menu Launch', campaign_type: 'Push Notification', trigger_type: 'manual', status: 'scheduled', sent_count: 0, delivered_count: 0, opened_count: 0, scheduled_at: '2025-02-01 12:00' },
];

const SEGMENTS = [
  { id: 1, name: 'High-Value Customers', description: 'Ordered > 10 times, avg order > AED 150', member_count: 342, criteria: 'orders >= 10 AND avg_value >= 150' },
  { id: 2, name: 'Inactive (60+ days)', description: 'No order in past 60 days', member_count: 1285, criteria: 'last_order < 60_days_ago' },
  { id: 3, name: 'Birthday This Month', description: 'Customers with birthday this month', member_count: 87, criteria: 'birth_month = current_month' },
  { id: 4, name: 'Delivery Only', description: 'Only orders via delivery platforms', member_count: 2140, criteria: 'channel = delivery' },
];

const AUTOMATIONS = [
  { trigger: 'Order Completed', action: 'Send Feedback Request (WhatsApp)', delay: '2 hours', status: 'active', sent_30d: 3240 },
  { trigger: 'Birthday (7 days before)', action: 'Send Birthday Offer (SMS)', delay: 'Immediately', status: 'active', sent_30d: 87 },
  { trigger: '60 Days Inactive', action: 'Re-engagement Campaign (Email)', delay: 'Immediately', status: 'active', sent_30d: 215 },
  { trigger: 'New Member Registered', action: 'Welcome Message (WhatsApp)', delay: '1 minute', status: 'paused', sent_30d: 0 },
];

const LOGS = [
  { campaign: 'Ramadan Special', recipient: '+971501234567', channel: 'SMS', status: 'delivered', timestamp: '2025-01-15 09:02' },
  { campaign: 'Weekend Brunch Promo', recipient: 'sara@email.com', channel: 'Email', status: 'opened', timestamp: '2025-01-20 10:15' },
  { campaign: 'Weekend Brunch Promo', recipient: 'omar@email.com', channel: 'Email', status: 'bounced', timestamp: '2025-01-20 10:12' },
];

const STATUS_COLORS = { completed: 'bg-green-100 text-green-800', running: 'bg-blue-100 text-blue-800', draft: 'bg-gray-100 text-gray-600', scheduled: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', paused: 'bg-gray-100 text-gray-500', delivered: 'bg-green-100 text-green-700', opened: 'bg-blue-100 text-blue-700', bounced: 'bg-red-100 text-red-700' };

export default function Marketing() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/marketing\/?/, '');
  const tab = PATH_MAP[subPath] || 'Campaigns';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/marketing/${TAB_PATH[t]}` : '/marketing');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Automation</h1>
          <p className="text-sm text-gray-500 mt-1">Campaigns, customer segments and automated messaging</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Campaign</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total Campaigns', value: CAMPAIGNS.length, color: 'blue' }, { label: 'Messages Sent (30d)', value: '6,020', color: 'green' }, { label: 'Avg Open Rate', value: '27%', color: 'indigo' }, { label: 'Active Automations', value: AUTOMATIONS.filter(a => a.status === 'active').length, color: 'purple' }].map(k => (
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

      {tab === 'Campaigns' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Campaign', 'Channel', 'Trigger', 'Sent', 'Delivered', 'Opened', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{CAMPAIGNS.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.campaign_type}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.trigger_type}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.sent_count.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{c.delivered_count.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-indigo-600">{c.opened_count.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3">{c.status === 'draft' && <button className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg">Send</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Segments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{SEGMENTS.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                <p className="text-xs font-mono text-gray-400 mt-2 bg-gray-50 px-2 py-1 rounded">{s.criteria}</p>
              </div>
              <span className="text-2xl font-bold text-indigo-600">{s.member_count.toLocaleString()}</span>
            </div>
            <button className="mt-3 text-xs px-3 py-1 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50">Create Campaign</button>
          </div>
        ))}</div>
      )}

      {tab === 'Automation' && (
        <div className="space-y-3">{AUTOMATIONS.map((a, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{a.trigger}</span>
                <span className="text-gray-400 text-xs">→</span>
                <span className="text-sm font-medium text-gray-900">{a.action}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Delay: {a.delay} | Sent last 30d: {a.sent_30d.toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
          </div>
        ))}</div>
      )}

      {tab === 'Logs' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Campaign', 'Recipient', 'Channel', 'Status', 'Timestamp'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{LOGS.map((l, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.campaign}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{l.recipient}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{l.channel}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                <td className="px-4 py-3 text-xs text-gray-400">{l.timestamp}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
