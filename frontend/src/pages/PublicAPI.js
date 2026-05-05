import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'API Keys', 'webhooks': 'Webhooks', 'logs': 'Usage Logs', 'rate-limits': 'Rate Limits' };
const TAB_PATH = { 'API Keys': '', 'Webhooks': 'webhooks', 'Usage Logs': 'logs', 'Rate Limits': 'rate-limits' };

const API_KEYS = [
  { id: 1, name: 'POS Integration — Branch 1', key_prefix: 'sk_live_xK9m...', scopes: ['orders:read', 'menu:read', 'tables:read'], last_used: '2025-01-20 14:32', created_at: '2024-06-01', status: 'active', requests_today: 1482 },
  { id: 2, name: 'Mobile App Backend', key_prefix: 'sk_live_pQ3n...', scopes: ['orders:write', 'menu:read', 'reservations:write'], last_used: '2025-01-20 14:45', created_at: '2024-08-15', status: 'active', requests_today: 8921 },
  { id: 3, name: 'Third-party Analytics', key_prefix: 'sk_live_wR7t...', scopes: ['reports:read'], last_used: '2025-01-19 08:00', created_at: '2024-11-01', status: 'active', requests_today: 45 },
  { id: 4, name: 'Legacy Aggregator Connector', key_prefix: 'sk_live_hF2a...', scopes: ['orders:write'], last_used: '2024-12-15 12:00', created_at: '2023-03-01', status: 'revoked', requests_today: 0 },
];

const WEBHOOKS = [
  { id: 1, name: 'Order Status to POS', endpoint_url: 'https://pos.branch1.internal/webhook/orders', events: ['order.created', 'order.updated', 'order.completed'], is_active: true, last_triggered: '2025-01-20 14:45', success_rate: 99.2 },
  { id: 2, name: 'New Reservation Alert', endpoint_url: 'https://hooks.crm.example.com/reservations', events: ['reservation.created', 'reservation.cancelled'], is_active: true, last_triggered: '2025-01-20 13:10', success_rate: 97.8 },
  { id: 3, name: 'Low Stock Slack Alert', endpoint_url: 'https://hooks.slack.com/services/T0XX/B0XX/xxxxx', events: ['inventory.low_stock'], is_active: false, last_triggered: '2025-01-10 08:00', success_rate: 100 },
];

const LOGS = [
  { id: 1, api_key_name: 'Mobile App Backend', endpoint: '/api/orders', method: 'POST', status_code: 201, response_time_ms: 42, ip_address: '10.0.1.55', created_at: '14:45:21' },
  { id: 2, api_key_name: 'Mobile App Backend', endpoint: '/api/menu', method: 'GET', status_code: 200, response_time_ms: 15, ip_address: '10.0.1.55', created_at: '14:45:18' },
  { id: 3, api_key_name: 'POS Integration — Branch 1', endpoint: '/api/tables', method: 'GET', status_code: 200, response_time_ms: 8, ip_address: '192.168.1.10', created_at: '14:32:05' },
  { id: 4, api_key_name: 'Mobile App Backend', endpoint: '/api/reservations', method: 'POST', status_code: 400, response_time_ms: 5, ip_address: '10.0.1.55', created_at: '14:28:44' },
];

const RATE_TIERS = [
  { tier: 'Standard', requests_per_min: 60, requests_per_day: 10000, burst_limit: 100, applies_to: 'Default for all keys' },
  { tier: 'Premium', requests_per_min: 300, requests_per_day: 50000, burst_limit: 500, applies_to: 'Mobile App keys' },
  { tier: 'Internal', requests_per_min: 1000, requests_per_day: 500000, burst_limit: 2000, applies_to: 'Internal integrations' },
];

const STATUS_COLORS = { active: 'bg-green-100 text-green-700', revoked: 'bg-red-100 text-red-700', disabled: 'bg-gray-100 text-gray-500' };
const METHOD_COLORS = { GET: 'bg-blue-100 text-blue-700', POST: 'bg-green-100 text-green-700', PUT: 'bg-yellow-100 text-yellow-700', DELETE: 'bg-red-100 text-red-700', PATCH: 'bg-purple-100 text-purple-700' };

export default function PublicAPI() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/api-ecosystem\/?/, '');
  const tab = PATH_MAP[subPath] || 'API Keys';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/api-ecosystem/${TAB_PATH[t]}` : '/api-ecosystem');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Public API Ecosystem</h1>
          <p className="text-sm text-gray-500 mt-1">Manage API keys, webhooks, usage logs and rate limits</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Create API Key</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Keys', value: API_KEYS.filter(k => k.status === 'active').length, color: 'green' }, { label: 'Requests Today', value: API_KEYS.reduce((s, k) => s + k.requests_today, 0).toLocaleString(), color: 'blue' }, { label: 'Active Webhooks', value: WEBHOOKS.filter(w => w.is_active).length, color: 'indigo' }, { label: 'Errors (24h)', value: LOGS.filter(l => l.status_code >= 400).length, color: 'red' }].map(k => (
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

      {tab === 'API Keys' && (
        <div className="space-y-3">{API_KEYS.map(k => (
          <div key={k.id} className={`bg-white rounded-xl shadow-sm border p-4 ${k.status === 'revoked' ? 'opacity-60 border-gray-100' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{k.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[k.status]}`}>{k.status}</span>
                </div>
                <p className="text-sm font-mono text-gray-500 mb-1">{k.key_prefix}<span className="text-gray-300">••••••••••••••••••••</span></p>
                <div className="flex flex-wrap gap-1 mb-1">{k.scopes.map(s => <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{s}</span>)}</div>
                <p className="text-xs text-gray-400">Last used: {k.last_used} · Requests today: {k.requests_today.toLocaleString()}</p>
              </div>
              {k.status === 'active' && <button className="text-xs px-3 py-1 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Revoke</button>}
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Webhooks' && (
        <div className="space-y-3">{WEBHOOKS.map(w => (
          <div key={w.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-900">{w.name}</p>
                <p className="text-xs font-mono text-indigo-600 mt-0.5 break-all">{w.endpoint_url}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{w.is_active ? 'active' : 'disabled'}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">{w.events.map(e => <span key={e} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">{e}</span>)}</div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Last triggered: {w.last_triggered}</span>
              <span>Success rate: {w.success_rate}%</span>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Usage Logs' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Key', 'Endpoint', 'Method', 'Status', 'Time (ms)', 'IP', 'Timestamp'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{LOGS.map(l => (
              <tr key={l.id} className={`hover:bg-gray-50 ${l.status_code >= 400 ? 'bg-red-50' : ''}`}>
                <td className="px-4 py-3 text-xs text-gray-600">{l.api_key_name}</td>
                <td className="px-4 py-3 text-xs font-mono text-indigo-700">{l.endpoint}</td>
                <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${METHOD_COLORS[l.method]}`}>{l.method}</span></td>
                <td className="px-4 py-3"><span className={`text-sm font-bold ${l.status_code < 300 ? 'text-green-600' : l.status_code < 400 ? 'text-yellow-600' : 'text-red-600'}`}>{l.status_code}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{l.response_time_ms}ms</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.ip_address}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{l.created_at}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Rate Limits' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Tier', 'Req/min', 'Req/day', 'Burst Limit', 'Applies To'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{RATE_TIERS.map(r => (
              <tr key={r.tier} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{r.tier}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{r.requests_per_min.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{r.requests_per_day.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{r.burst_limit.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.applies_to}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
