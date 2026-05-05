import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  BanknotesIcon, CreditCardIcon, DevicePhoneMobileIcon,
  CalendarIcon, MagnifyingGlassIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const METHOD_LABELS = { cash: 'Cash', card: 'Card', bkash: 'bKash', nagad: 'Nagad' };
const METHOD_COLORS = {
  cash:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: BanknotesIcon,         dot: 'bg-emerald-400' },
  card:   { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     icon: CreditCardIcon,        dot: 'bg-sky-400'     },
  bkash:  { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200',    icon: DevicePhoneMobileIcon, dot: 'bg-pink-400'    },
  nagad:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  icon: DevicePhoneMobileIcon, dot: 'bg-orange-400'  },
};

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeaway' };

export default function CollectedAmount() {
  const { api } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [filterMethod, setFilterMethod] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['collected-amount', startDate, endDate],
    () => api.get('/orders/collected-amount', {
      params: { start_date: startDate || undefined, end_date: endDate || undefined },
    }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const summary = data?.summary || [];
  const grandTotal = data?.grandTotal || 0;
  const allTransactions = data?.transactions || [];

  const transactions = allTransactions.filter(t => {
    if (filterMethod && t.payment_method !== filterMethod) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.order_number?.toLowerCase().includes(q) ||
      t.customer_name?.toLowerCase().includes(q) ||
      t.waiter_name?.toLowerCase().includes(q)
    );
  });

  // Build method cards including methods with no data
  const allMethods = ['cash', 'card', 'bkash', 'nagad'];
  const methodMap = {};
  summary.forEach(s => { methodMap[s.payment_method] = s; });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <BanknotesIcon className="h-6 w-6 text-emerald-500" /> Collected Amount
        </h1>
        <p className="text-slate-500 text-sm">Payment collection breakdown by method</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <CalendarIcon className="h-4 w-4" />
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="input w-36 text-sm" />
          <span>—</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="input w-36 text-sm" />
        </div>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="select w-32">
          <option value="">All Methods</option>
          {allMethods.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search orders, customers…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (<>
        {/* Grand total */}
        <div className="card p-5 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-100">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Grand Total Collected</p>
          <p className="text-4xl font-black text-emerald-700 mt-1">৳{grandTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{allTransactions.length} transaction{allTransactions.length !== 1 ? 's' : ''} · {startDate === endDate ? startDate : `${startDate} → ${endDate}`}</p>
        </div>

        {/* Method KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {allMethods.map(method => {
            const stat = methodMap[method];
            const styles = METHOD_COLORS[method] || METHOD_COLORS.cash;
            const Icon = styles.icon;
            const total = stat ? parseFloat(stat.total_amount) : 0;
            const count = stat ? parseInt(stat.count) : 0;
            const pct = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0';
            return (
              <button
                key={method}
                onClick={() => setFilterMethod(filterMethod === method ? '' : method)}
                className={`card p-4 text-left transition-all border-2 ${filterMethod === method ? `${styles.border} ring-2 ring-offset-1` : 'border-transparent'} ${styles.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${styles.text}`} />
                  <span className={`text-sm font-bold ${styles.text}`}>{METHOD_LABELS[method]}</span>
                </div>
                <p className={`text-2xl font-black ${styles.text}`}>৳{total.toFixed(0)}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">{count} txn{count !== 1 ? 's' : ''}</span>
                  <span className={`text-xs font-bold ${styles.text}`}>{pct}%</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full ${styles.dot} rounded-full transition-all`}
                    style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Transaction list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-700 text-sm">Transactions</h2>
            <span className="text-xs text-slate-400">{transactions.length} shown</span>
          </div>
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <BanknotesIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
              {transactions.map(txn => {
                const styles = METHOD_COLORS[txn.payment_method] || METHOD_COLORS.cash;
                return (
                  <div key={txn.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.bg}`}>
                        <styles.icon className={`h-4 w-4 ${styles.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-700">{txn.order_number}</span>
                          {txn.table_number && <span className="text-xs text-slate-400">Table {txn.table_number}</span>}
                          <span className="text-xs text-slate-400">{TYPE_LABELS[txn.order_type] || txn.order_type}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          {txn.customer_name && <span className="text-slate-500 font-medium">{txn.customer_name}</span>}
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {new Date(txn.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          {txn.waiter_name && <span>· {txn.waiter_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-800 text-base">৳{parseFloat(txn.amount).toFixed(0)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${styles.bg} ${styles.text} ${styles.border}`}>
                        {METHOD_LABELS[txn.payment_method] || txn.payment_method}
                        {txn.transaction_id ? ` ·${txn.transaction_id.slice(-4)}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}
