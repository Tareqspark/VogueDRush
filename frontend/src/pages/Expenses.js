import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const TABS = ['Expenses', 'Approval Queue', 'Recurring', 'Budget vs Actual'];

const PATH_MAP = {
  '':          'Expenses',
  'entry':     'Expenses',
  'approval':  'Approval Queue',
  'recurring': 'Recurring',
  'budget':    'Budget vs Actual',
};
const TAB_PATH = {
  'Expenses':         '',
  'Approval Queue':   'approval',
  'Recurring':        'recurring',
  'Budget vs Actual': 'budget',
};

const EXPENSES = [
  { id: 1, date: '2026-05-05', category: 'Utilities',      description: 'DEWA Electricity bill – May',     amount: 3200.00, ref: 'EXP-2026-058', submittedBy: 'Admin',        approver: 'Owner',   status: 'approved' },
  { id: 2, date: '2026-05-05', category: 'Marketing',      description: 'Instagram ad campaign – May',    amount: 1500.00, ref: 'EXP-2026-057', submittedBy: 'Marketing Mgr',approver: 'GM',      status: 'approved' },
  { id: 3, date: '2026-05-04', category: 'Maintenance',    description: 'HVAC service contract quarterly', amount: 2800.00, ref: 'EXP-2026-056', submittedBy: 'Facility Mgr', approver: 'Owner',   status: 'pending' },
  { id: 4, date: '2026-05-04', category: 'Staff',          description: 'Team outing – staff recognition', amount: 850.00,  ref: 'EXP-2026-055', submittedBy: 'HR Manager',   approver: 'GM',      status: 'pending' },
  { id: 5, date: '2026-05-03', category: 'Office',         description: 'Cleaning supplies & PPE restock', amount: 420.00,  ref: 'EXP-2026-054', submittedBy: 'Admin',        approver: 'Manager', status: 'approved' },
  { id: 6, date: '2026-05-02', category: 'Food Cost',      description: 'Emergency protein purchase – COD', amount: 4500.00, ref: 'EXP-2026-053', submittedBy: 'Head Chef',    approver: 'Owner',   status: 'rejected' },
  { id: 7, date: '2026-05-01', category: 'Insurance',      description: 'Monthly insurance premium',       amount: 1200.00, ref: 'EXP-2026-052', submittedBy: 'Admin',        approver: 'Owner',   status: 'approved' },
];

const PENDING_APPROVALS = EXPENSES.filter(e => e.status === 'pending');

const RECURRING = [
  { id: 1, description: 'DEWA Electricity',       category: 'Utilities',   frequency: 'Monthly',   amount: 3200.00, nextDue: '2026-06-05', status: 'active' },
  { id: 2, description: 'Monthly Insurance',      category: 'Insurance',   frequency: 'Monthly',   amount: 1200.00, nextDue: '2026-06-01', status: 'active' },
  { id: 3, description: 'HVAC Service Contract',  category: 'Maintenance', frequency: 'Quarterly', amount: 2800.00, nextDue: '2026-08-04', status: 'active' },
  { id: 4, description: 'POS License Renewal',    category: 'Software',    frequency: 'Annual',    amount: 8400.00, nextDue: '2026-12-01', status: 'active' },
  { id: 5, description: 'Property Rent',          category: 'Rent',        frequency: 'Monthly',   amount: 18000.00,nextDue: '2026-06-01', status: 'active' },
];

const BUDGET = [
  { category: 'Food & Beverage',  budget: 85000, actual: 78200, variance:  6800 },
  { category: 'Payroll',          budget: 45000, actual: 47200, variance: -2200 },
  { category: 'Rent',             budget: 18000, actual: 18000, variance:     0 },
  { category: 'Utilities',        budget:  5500, actual:  5800, variance:  -300 },
  { category: 'Marketing',        budget:  4000, actual:  3100, variance:   900 },
  { category: 'Maintenance',      budget:  3500, actual:  2800, variance:   700 },
  { category: 'Insurance',        budget:  1200, actual:  1200, variance:     0 },
  { category: 'Office & Admin',   budget:  1000, actual:   780, variance:   220 },
];

const EXP_STYLE = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending:  'bg-amber-50 text-amber-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const CAT_COLOR = {
  Utilities:    'bg-sky-100 text-sky-700',
  Marketing:    'bg-violet-100 text-violet-700',
  Maintenance:  'bg-amber-100 text-amber-700',
  Staff:        'bg-pink-100 text-pink-700',
  Office:       'bg-slate-100 text-slate-600',
  'Food Cost':  'bg-orange-100 text-orange-700',
  Insurance:    'bg-teal-100 text-teal-700',
  Software:     'bg-indigo-100 text-indigo-700',
  Rent:         'bg-red-100 text-red-700',
};

export default function Expenses() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath  = location.pathname.replace(/^\/expenses\/?/, '');
  const tab      = PATH_MAP[subPath] || 'Expenses';
  const setTab   = (t) => navigate(TAB_PATH[t] ? `/expenses/${TAB_PATH[t]}` : '/expenses');

  const monthTotal  = EXPENSES.filter(e => e.status !== 'rejected').reduce((s, e) => s + e.amount, 0);
  const pendingAmt  = PENDING_APPROVALS.reduce((s, e) => s + e.amount, 0);
  const totalBudget = BUDGET.reduce((s, b) => s + b.budget, 0);
  const totalActual = BUDGET.reduce((s, b) => s + b.actual, 0);
  const budgetPct   = ((totalActual / totalBudget) * 100).toFixed(1);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Expense Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module E · Expense Entry · Approval Workflow · Recurring · Budget vs Actual</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Expense</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Month Total',        val: `AED ${(monthTotal/1000).toFixed(1)}K`,   sub: 'Approved entries only',       color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Pending Approval',   val: `AED ${pendingAmt.toLocaleString()}`,      sub: `${PENDING_APPROVALS.length} awaiting review`,color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'vs Budget',          val: `${budgetPct}%`,                           sub: totalActual > totalBudget ? 'OVER budget' : 'Under budget', color: totalActual > totalBudget ? 'text-rose-700' : 'text-emerald-700', bg: totalActual > totalBudget ? 'bg-rose-50' : 'bg-emerald-50', border: totalActual > totalBudget ? 'border-rose-200' : 'border-emerald-200' },
          { label: 'Recurring Schedules',val: RECURRING.length,                          sub: 'Auto-generated monthly',      color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t ? 'text-sky-700 border-sky-500 bg-sky-50/40' : 'text-slate-500 border-transparent hover:text-slate-700'}`}>
              {t}
              {t === 'Approval Queue' && PENDING_APPROVALS.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-xs font-black">{PENDING_APPROVALS.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Expenses' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Reference</th><th>Submitted By</th><th>Approver</th><th>Status</th></tr></thead>
                <tbody>
                  {EXPENSES.map(e => (
                    <tr key={e.id}>
                      <td className="text-xs text-slate-500">{e.date}</td>
                      <td><span className={`status-badge text-xs ${CAT_COLOR[e.category] || 'bg-slate-100 text-slate-600'}`}>{e.category}</span></td>
                      <td className="font-semibold text-slate-800 max-w-[240px]">{e.description}</td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {e.amount.toLocaleString()}</td>
                      <td><code className="text-xs text-sky-700">{e.ref}</code></td>
                      <td className="text-xs text-slate-500">{e.submittedBy}</td>
                      <td className="text-xs text-slate-500">{e.approver}</td>
                      <td><span className={`status-badge ${EXP_STYLE[e.status]}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Approval Queue' && (
            <div className="space-y-3">
              {PENDING_APPROVALS.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircleIcon className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">All caught up! No pending approvals.</p>
                </div>
              ) : PENDING_APPROVALS.map(e => (
                <div key={e.id} className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <ClockIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{e.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Submitted by <strong>{e.submittedBy}</strong> on {e.date} · Category: {e.category}</p>
                      </div>
                      <p className="text-lg font-black text-amber-700">AED {e.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="btn btn-sm" style={{background:'#10b981',color:'white'}}>✓ Approve</button>
                      <button className="btn btn-sm" style={{background:'#ef4444',color:'white'}}>✗ Reject</button>
                      <button className="btn btn-ghost btn-sm text-sky-600 text-xs">Request Info</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Recurring' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Description</th><th>Category</th><th>Frequency</th><th>Amount</th><th>Next Due</th><th>Status</th></tr></thead>
                <tbody>
                  {RECURRING.map(r => (
                    <tr key={r.id}>
                      <td className="font-semibold text-slate-800">{r.description}</td>
                      <td><span className={`status-badge text-xs ${CAT_COLOR[r.category] || 'bg-slate-100 text-slate-600'}`}>{r.category}</span></td>
                      <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.frequency}</span></td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {r.amount.toLocaleString()}</td>
                      <td className="text-xs text-slate-600 font-semibold">{r.nextDue}</td>
                      <td><span className="status-badge bg-emerald-50 text-emerald-700">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Budget vs Actual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-500">May 2026 · Budget period: 1 Jan – 31 May 2026</p>
                <p className={`text-sm font-bold ${totalActual > totalBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Overall: AED {totalActual.toLocaleString()} / AED {totalBudget.toLocaleString()}
                </p>
              </div>
              <div className="space-y-3">
                {BUDGET.map(b => {
                  const pct = Math.min((b.actual / b.budget) * 100, 120);
                  const over = b.actual > b.budget;
                  return (
                    <div key={b.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-700">{b.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">AED {b.actual.toLocaleString()} / {b.budget.toLocaleString()}</span>
                          <span className={`text-xs font-bold ${over ? 'text-rose-600' : b.variance === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {over ? `▲ AED ${Math.abs(b.variance).toLocaleString()} over` : b.variance === 0 ? 'On budget' : `▼ AED ${b.variance.toLocaleString()} under`}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center pl-2">
                          <span className="text-xs text-white font-bold" style={{ visibility: pct > 25 ? 'visible' : 'hidden' }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
