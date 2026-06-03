import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

export default function ReceiptsTab() {
  const { api } = useAuth();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery(
    ['receipts-tab', dateFrom, dateTo],
    () => api.get('/orders/receipts/history', { params: { limit: 100, date_from: dateFrom || undefined, date_to: dateTo || undefined } }).then(r => r.data),
    { refetchInterval: 60000 }
  );

  const receipts = (data?.receipts || []).filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.order_number?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.payment_method?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-black text-slate-800">Receipt History</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search order / customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-sm w-48"
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm w-36" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm w-36" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner /></div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">No receipts found</div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-semibold">{receipts.length} receipts · ৳{receipts.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0).toFixed(0)} total</p>
          {receipts.map(r => (
            <div key={r.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-mono font-black text-slate-700 text-sm">{r.order_number}</span>
                  {r.customer_name && <span className="ml-2 text-xs text-slate-500">{r.customer_name}</span>}
                  <div className="text-xs text-slate-400 mt-0.5">
                    {r.order_type === 'direct' ? 'Takeaway' : r.order_type} · {r.payment_method || '—'}
                    {r.transaction_id ? ` (${r.transaction_id})` : ''}
                  </div>
                  <div className="text-xs text-slate-400">
                    Discount: ৳{parseFloat(r.discount_amount || 0).toFixed(2)}
                    {r.waiter_full_name && <span className="ml-2">· {r.waiter_full_name}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sky-600 text-sm">৳{parseFloat(r.total_amount || 0).toFixed(2)}</div>
                  <div className="text-xs text-slate-400">{new Date(r.bill_printed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
