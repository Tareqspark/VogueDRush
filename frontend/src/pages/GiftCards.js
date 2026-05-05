import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Cards', 'issue': 'Issue Card', 'transactions': 'Transactions', 'expiring': 'Expiring' };
const TAB_PATH = { 'Cards': '', 'Issue Card': 'issue', 'Transactions': 'transactions', 'Expiring': 'expiring' };

const CARDS = [
  { id: 1, card_code: 'GC-2025-00142', issued_to: 'Ahmed Al Nouri', phone: '+971501234567', initial_value: 500, current_balance: 320, status: 'active', expiry_date: '2025-12-31', issued_date: '2025-01-10' },
  { id: 2, card_code: 'GC-2025-00141', issued_to: 'Sara Khalid', phone: '+971559876543', initial_value: 200, current_balance: 0, status: 'exhausted', expiry_date: '2025-06-30', issued_date: '2025-01-05' },
  { id: 3, card_code: 'GC-2025-00138', issued_to: 'Corporate Gift — TechCorp', phone: null, initial_value: 5000, current_balance: 3750, status: 'active', expiry_date: '2025-03-01', issued_date: '2024-12-15' },
  { id: 4, card_code: 'GC-2024-00099', issued_to: 'Omar Rashid', phone: '+971507654321', initial_value: 300, current_balance: 85, status: 'active', expiry_date: '2025-02-15', issued_date: '2024-08-10' },
];

const TRANSACTIONS = [
  { id: 1, card_code: 'GC-2025-00142', txn_type: 'redemption', amount: 85, balance_after: 320, reference: 'ORD-8821', txn_date: '2025-01-20 14:32', processed_by: 'POS Terminal 1' },
  { id: 2, card_code: 'GC-2025-00141', txn_type: 'redemption', amount: 120, balance_after: 0, reference: 'ORD-8790', txn_date: '2025-01-19 12:15', processed_by: 'POS Terminal 2' },
  { id: 3, card_code: 'GC-2025-00138', txn_type: 'topup', amount: 1000, balance_after: 3750, reference: 'TOPUP-221', txn_date: '2025-01-18 10:00', processed_by: 'Admin' },
];

const EXPIRING_CARDS = CARDS.filter(c => c.status === 'active' && new Date(c.expiry_date) < new Date('2025-04-01'));

const STATUS_COLORS = { active: 'bg-green-100 text-green-700', exhausted: 'bg-gray-100 text-gray-500', expired: 'bg-red-100 text-red-700', suspended: 'bg-yellow-100 text-yellow-700' };
const TXN_COLORS = { redemption: 'bg-red-100 text-red-700', topup: 'bg-green-100 text-green-700', issuance: 'bg-blue-100 text-blue-700', refund: 'bg-purple-100 text-purple-700' };

export default function GiftCards() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/gift-cards\/?/, '');
  const tab = PATH_MAP[subPath] || 'Cards';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/gift-cards/${TAB_PATH[t]}` : '/gift-cards');

  const [form, setForm] = useState({ issued_to: '', phone: '', initial_value: '', expiry_date: '', notes: '' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gift Card System</h1>
          <p className="text-sm text-gray-500 mt-1">Issue, track and manage physical and digital gift cards</p>
        </div>
        <button onClick={() => setTab('Issue Card')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Issue Gift Card</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Cards', value: CARDS.filter(c => c.status === 'active').length, color: 'green' }, { label: 'Total Outstanding', value: `AED ${CARDS.filter(c => c.status === 'active').reduce((s, c) => s + c.current_balance, 0).toLocaleString()}`, color: 'indigo' }, { label: 'Expiring (90d)', value: EXPIRING_CARDS.length, color: 'orange' }, { label: 'Revenue (30d)', value: 'AED 1,840', color: 'blue' }].map(k => (
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

      {tab === 'Cards' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Card Code', 'Issued To', 'Initial Value', 'Balance', 'Status', 'Expiry', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{CARDS.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-indigo-600">{c.card_code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{c.issued_to}</td>
                <td className="px-4 py-3 text-sm text-gray-600">AED {c.initial_value.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">AED {c.current_balance.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.expiry_date}</td>
                <td className="px-4 py-3"><button className="text-xs text-indigo-600 hover:text-indigo-800">Top Up</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Issue Card' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
          <h2 className="font-semibold text-gray-900 mb-4">Issue New Gift Card</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Issued To</label>
              <input value={form.issued_to} onChange={e => setForm({...form, issued_to: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Customer name or company" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="+971 5X XXX XXXX" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Initial Value (AED)</label>
              <input type="number" value={form.initial_value} onChange={e => setForm({...form, initial_value: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Purpose, occasion, etc." /></div>
            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Issue Card</button>
          </div>
        </div>
      )}

      {tab === 'Transactions' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Card Code', 'Type', 'Amount', 'Balance After', 'Reference', 'Date', 'Processed By'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{TRANSACTIONS.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-indigo-600">{t.card_code}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TXN_COLORS[t.txn_type]}`}>{t.txn_type}</span></td>
                <td className={`px-4 py-3 text-sm font-bold ${t.txn_type === 'redemption' ? 'text-red-600' : 'text-green-600'}`}>{t.txn_type === 'redemption' ? '-' : '+'}AED {t.amount}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {t.balance_after}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{t.reference}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{t.txn_date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.processed_by}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Expiring' && (
        <div className="space-y-3">{EXPIRING_CARDS.map(c => (
          <div key={c.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-mono text-sm text-indigo-700">{c.card_code}</p>
              <p className="font-medium text-gray-900 mt-0.5">{c.issued_to}</p>
              <p className="text-sm text-yellow-700 mt-0.5">Expires: {c.expiry_date} · Balance: AED {c.current_balance}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1 border border-yellow-400 text-yellow-700 rounded-lg hover:bg-yellow-100">Extend</button>
              <button className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Notify</button>
            </div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
