import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

export default function TransactionsTab() {
  const { api } = useAuth();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery(
    ['transactions-tab', dateFrom, dateTo],
    () => api.get('/orders/transactions/report', { params: { limit: 100, date_from: dateFrom || undefined, date_to: dateTo || undefined } }).then(r => r.data),
    { refetchInterval: 60000 }
  );

  const transactions = (data?.transactions || []).filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.order_number?.toLowerCase().includes(q) ||
      t.payment_method?.toLowerCase().includes(q) ||
      t.transaction_id?.toLowerCase().includes(q)
    );
  });

  const total = transactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalDiscount = transactions.reduce((s, t) => s + parseFloat(t.discount_amount || 0), 0);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-black text-slate-800">Transaction Report</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search order / method..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-sm w-48"
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm w-36" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm w-36" />
        </div>
      </div>

      {!isLoading && transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-center">
            <div className="text-xs text-sky-500 font-semibold">Total Collected</div>
            <div className="text-xl font-black text-sky-700">৳{total.toFixed(0)}</div>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-center">
            <div className="text-xs text-rose-500 font-semibold">Total Discount</div>
            <div className="text-xl font-black text-rose-700">৳{totalDiscount.toFixed(0)}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No transactions found</div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-semibold">{transactions.length} transactions</p>
          {transactions.map(t => (
            <div key={t.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-mono font-black text-slate-700 text-sm">{t.order_number}</span>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {t.transaction_id?.startsWith('NAGAD-') ? 'Nagad' : t.payment_method || '—'}
                    {t.transaction_id ? ` · ${t.transaction_id}` : ''}
                  </div>
                  {t.discount_amount > 0 && (
                    <div className="text-xs text-rose-400">Discount: ৳{parseFloat(t.discount_amount).toFixed(2)}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sky-600 text-sm">৳{parseFloat(t.amount || 0).toFixed(2)}</div>
                  <div className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
