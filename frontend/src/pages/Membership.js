import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Members', 'plans': 'Plans', 'benefits': 'Benefits', 'analytics': 'Analytics' };
const TAB_PATH = { 'Members': '', 'Plans': 'plans', 'Benefits': 'benefits', 'Analytics': 'analytics' };

const MEMBERS = [
  { id: 1, member_name: 'Ahmed Al Nouri', phone: '+971501234567', email: 'ahmed@email.com', plan: 'Gold', start_date: '2024-07-01', end_date: '2025-06-30', status: 'active', points: 4820 },
  { id: 2, member_name: 'Sara Khalid', phone: '+971559876543', email: 'sara@email.com', plan: 'Silver', start_date: '2025-01-01', end_date: '2025-12-31', status: 'active', points: 1250 },
  { id: 3, member_name: 'Omar Al Rashidi', phone: '+971507654321', email: 'omar@email.com', plan: 'Platinum', start_date: '2024-01-01', end_date: '2024-12-31', status: 'expired', points: 12400 },
  { id: 4, member_name: 'Fatima Hassan', phone: '+971504321098', email: 'fatima@email.com', plan: 'Gold', start_date: '2024-12-01', end_date: '2025-11-30', status: 'active', points: 890 },
  { id: 5, member_name: 'Khalid Mansouri', phone: '+971503219876', email: 'khalid@email.com', plan: 'Silver', start_date: '2025-01-15', end_date: '2026-01-14', status: 'active', points: 210 },
];

const PLANS = [
  { name: 'Silver', price_aed_year: 149, min_spend: 0, points_rate: '1 pt per AED 1', color: 'gray', perks: ['5% discount on dine-in', 'Priority queue', 'Birthday dessert', 'Monthly newsletter'] },
  { name: 'Gold', price_aed_year: 349, min_spend: 2000, points_rate: '1.5 pts per AED 1', color: 'yellow', perks: ['10% discount on dine-in', '5% on delivery', 'Priority reservations', 'Birthday free meal (up to AED 100)', 'Quarterly chef\'s table invite'] },
  { name: 'Platinum', price_aed_year: 799, min_spend: 5000, points_rate: '2 pts per AED 1', color: 'purple', perks: ['15% discount on all orders', 'Free delivery', 'Dedicated concierge', 'Monthly private dining event', 'Annual anniversary gift', 'Complimentary corporate gifting'] },
];

const BENEFITS_DETAIL = [
  { benefit: 'Dine-In Discount', silver: '5%', gold: '10%', platinum: '15%' },
  { benefit: 'Delivery Discount', silver: '—', gold: '5%', platinum: '10% + free delivery' },
  { benefit: 'Points Rate', silver: '1x', gold: '1.5x', platinum: '2x' },
  { benefit: 'Birthday Reward', silver: 'Dessert', gold: 'Free meal (AED 100)', platinum: 'Free meal + gift' },
  { benefit: 'Reservation Priority', silver: 'Standard', gold: 'Priority', platinum: 'Guaranteed' },
  { benefit: 'Private Events', silver: '—', gold: 'Quarterly', platinum: 'Monthly' },
];

const PLAN_COLORS = { Silver: 'bg-gray-100 text-gray-700', Gold: 'bg-yellow-100 text-yellow-800', Platinum: 'bg-purple-100 text-purple-800' };
const STATUS_COLORS = { active: 'bg-green-100 text-green-700', expired: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500' };

export default function Membership() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/membership\/?/, '');
  const tab = PATH_MAP[subPath] || 'Members';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/membership/${TAB_PATH[t]}` : '/membership');

  const activeMembers = MEMBERS.filter(m => m.status === 'active').length;
  const totalRevenue = MEMBERS.reduce((s, m) => {
    const plan = PLANS.find(p => p.name === m.plan);
    return s + (plan ? plan.price_aed_year : 0);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membership Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Manage loyalty memberships, plans and member benefits</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Member</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Members', value: activeMembers, color: 'green' }, { label: 'Expiring (30d)', value: 1, color: 'yellow' }, { label: 'Membership Revenue', value: `AED ${totalRevenue.toLocaleString()}`, color: 'indigo' }, { label: 'Total Points Issued', value: '19,570', color: 'blue' }].map(k => (
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

      {tab === 'Members' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Member', 'Plan', 'Start', 'End', 'Status', 'Points', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{MEMBERS.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{m.member_name}</p>
                  <p className="text-xs text-gray-500">{m.phone}</p>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[m.plan]}`}>{m.plan}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.start_date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.end_date}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.status]}`}>{m.status}</span></td>
                <td className="px-4 py-3 text-sm font-bold text-indigo-600">{m.points.toLocaleString()}</td>
                <td className="px-4 py-3"><button className="text-xs text-gray-400 hover:text-red-600">Cancel</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{PLANS.map(p => (
          <div key={p.name} className={`rounded-2xl border-2 p-6 ${p.name === 'Gold' ? 'border-yellow-400 bg-yellow-50' : p.name === 'Platinum' ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[p.name]}`}>{p.name}</span>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">AED {p.price_aed_year}<span className="text-sm font-normal text-gray-500">/year</span></p>
            <p className="text-xs text-gray-500 mb-4">Points: {p.points_rate}</p>
            <ul className="space-y-2">{p.perks.map((perk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-green-500 mt-0.5">✓</span>{perk}</li>
            ))}</ul>
          </div>
        ))}</div>
      )}

      {tab === 'Benefits' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Benefit', 'Silver', 'Gold', 'Platinum'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{BENEFITS_DETAIL.map(b => (
              <tr key={b.benefit} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.benefit}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.silver}</td>
                <td className="px-4 py-3 text-sm text-yellow-700 font-medium">{b.gold}</td>
                <td className="px-4 py-3 text-sm text-purple-700 font-medium">{b.platinum}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(p => {
            const planMembers = MEMBERS.filter(m => m.plan === p.name);
            return (
              <div key={p.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">{p.name} Plan</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total Members</span><span className="font-bold text-indigo-600">{planMembers.length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Active</span><span className="font-medium text-green-600">{planMembers.filter(m => m.status === 'active').length}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Annual Revenue</span><span className="font-medium text-gray-900">AED {(planMembers.length * p.price_aed_year).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Points</span><span className="font-medium text-gray-900">{planMembers.reduce((s, m) => s + m.points, 0).toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
