import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

const TABS = ['Journal Entries', 'Chart of Accounts', 'Bank Reconciliation', 'VAT Summary', 'P&L Report'];

const JOURNALS = [
  { id: 1, date: '2026-05-05', ref: 'JE-2026-142', description: 'Daily sales revenue – Table service',  dr: 'Accounts Receivable', cr: 'Sales Revenue',      amount: 18450.00, status: 'posted',  by: 'System' },
  { id: 2, date: '2026-05-05', ref: 'JE-2026-141', description: 'VAT on sales – 5% UAE standard rate',  dr: 'Sales Revenue',       cr: 'VAT Payable',        amount: 877.38,   status: 'posted',  by: 'System' },
  { id: 3, date: '2026-05-05', ref: 'JE-2026-140', description: 'COGS – Chicken Breast consumption',     dr: 'COGS',                cr: 'Inventory – Proteins',amount: 672.00,  status: 'posted',  by: 'System' },
  { id: 4, date: '2026-05-04', ref: 'JE-2026-138', description: 'Supplier payment – Dairy Direct',       dr: 'Accounts Payable',    cr: 'Bank – Main A/C',    amount: 5600.00,  status: 'posted',  by: 'Admin' },
  { id: 5, date: '2026-05-04', ref: 'JE-2026-137', description: 'Electricity expense accrual',           dr: 'Utilities Expense',   cr: 'Accrued Liabilities', amount: 3200.00, status: 'posted',  by: 'Admin' },
  { id: 6, date: '2026-05-03', ref: 'JE-2026-135', description: 'Payroll expense – May W1',              dr: 'Payroll Expense',     cr: 'Payroll Payable',    amount: 24500.00, status: 'draft',   by: 'HR Mgr' },
];

const COA = [
  { code: '1000', name: 'Cash & Cash Equivalents',    type: 'Asset',     balance: 142000.00 },
  { code: '1100', name: 'Accounts Receivable',         type: 'Asset',     balance: 24800.00 },
  { code: '1200', name: 'Inventory',                   type: 'Asset',     balance: 38400.00 },
  { code: '2000', name: 'Accounts Payable',            type: 'Liability', balance: 38600.00 },
  { code: '2100', name: 'VAT Payable',                 type: 'Liability', balance: 9800.00  },
  { code: '2200', name: 'Accrued Liabilities',         type: 'Liability', balance: 8200.00  },
  { code: '3000', name: 'Owner\'s Equity',             type: 'Equity',    balance: 280000.00},
  { code: '4000', name: 'Sales Revenue',               type: 'Revenue',   balance: 385000.00},
  { code: '5000', name: 'COGS',                        type: 'Expense',   balance: 128000.00},
  { code: '6000', name: 'Payroll Expense',             type: 'Expense',   balance: 95000.00 },
  { code: '6100', name: 'Rent Expense',                type: 'Expense',   balance: 90000.00 },
  { code: '6200', name: 'Utilities Expense',           type: 'Expense',   balance: 16000.00 },
];

const RECON = [
  { id: 1, date: '2026-05-05', description: 'Card settlements – POS', bankAmt: 18450.00, bookAmt: 18450.00, diff: 0, status: 'matched' },
  { id: 2, date: '2026-05-04', description: 'Supplier payment – Dairy Direct', bankAmt: 5600.00, bookAmt: 5600.00, diff: 0, status: 'matched' },
  { id: 3, date: '2026-05-03', description: 'Cash deposit', bankAmt: 12000.00, bookAmt: 11850.00, diff: 150.00, status: 'unmatched' },
  { id: 4, date: '2026-05-02', description: 'Unknown debit', bankAmt: 320.00, bookAmt: 0, diff: -320.00, status: 'unmatched' },
  { id: 5, date: '2026-05-01', description: 'Online order settlement – Talabat', bankAmt: 4200.00, bookAmt: 4200.00, diff: 0, status: 'matched' },
];

const VAT = {
  period: 'Q2-2026 (Apr – Jun 2026)',
  outputVAT: 19250.00,
  inputVAT: 8400.00,
  net: 10850.00,
  breakdown: [
    { type: 'Standard 5%', sales: 385000.00, vat: 19250.00, category: 'Output' },
    { type: 'Purchases 5%', purchases: 168000.00, vat: 8400.00, category: 'Input' },
  ],
};

const PNL = [
  { line: 'Revenue',             amount: 385000.00, isTotal: false, indent: 0 },
  { line: 'Less: COGS',          amount:-128000.00, isTotal: false, indent: 1 },
  { line: 'Gross Profit',        amount: 257000.00, isTotal: true,  indent: 0 },
  { line: 'Payroll',             amount: -95000.00, isTotal: false, indent: 1 },
  { line: 'Rent',                amount: -90000.00, isTotal: false, indent: 1 },
  { line: 'Utilities',           amount: -16000.00, isTotal: false, indent: 1 },
  { line: 'Marketing',           amount:  -3100.00, isTotal: false, indent: 1 },
  { line: 'Other Expenses',      amount:  -6800.00, isTotal: false, indent: 1 },
  { line: 'EBITDA',              amount:  46100.00, isTotal: true,  indent: 0 },
  { line: 'Depreciation',        amount:  -4200.00, isTotal: false, indent: 1 },
  { line: 'Net Profit',          amount:  41900.00, isTotal: true,  indent: 0 },
];

const TYPE_STYLE = { Asset: 'bg-sky-50 text-sky-700', Liability: 'bg-rose-50 text-rose-700', Equity: 'bg-violet-50 text-violet-700', Revenue: 'bg-emerald-50 text-emerald-700', Expense: 'bg-amber-50 text-amber-700' };

export default function Accounting() {
  const [tab, setTab] = useState('Journal Entries');

  const revenue   = PNL.find(p => p.line === 'Revenue').amount;
  const cogs      = Math.abs(PNL.find(p => p.line === 'Less: COGS').amount);
  const netProfit = PNL.find(p => p.line === 'Net Profit').amount;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Accounting Module</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module F · Double-Entry · COA · Journal · Bank Recon · VAT · P&L · Balance Sheet</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> New Journal Entry</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (MTD)',  val: `AED ${(revenue/1000).toFixed(0)}K`,         sub: 'May 2026 to date',        color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'COGS',          val: `AED ${(cogs/1000).toFixed(0)}K`,             sub: `${((cogs/revenue)*100).toFixed(1)}% food cost`,  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'Net Profit',    val: `AED ${(netProfit/1000).toFixed(1)}K`,        sub: `${((netProfit/revenue)*100).toFixed(1)}% margin`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'VAT Payable',   val: `AED ${VAT.net.toLocaleString()}`,            sub: `Q2-2026 · Net payable`,   color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
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
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Journal Entries' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Debit A/C</th><th>Credit A/C</th><th>Amount</th><th>Status</th><th>By</th></tr></thead>
                <tbody>
                  {JOURNALS.map(j => (
                    <tr key={j.id}>
                      <td className="text-xs text-slate-500">{j.date}</td>
                      <td><code className="text-xs font-mono text-sky-700 font-bold">{j.ref}</code></td>
                      <td className="font-semibold text-slate-800 max-w-[220px]">{j.description}</td>
                      <td><span className="text-xs text-rose-600 font-semibold">Dr: {j.dr}</span></td>
                      <td><span className="text-xs text-emerald-600 font-semibold">Cr: {j.cr}</span></td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {j.amount.toLocaleString()}</td>
                      <td><span className={`status-badge ${j.status === 'posted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{j.status}</span></td>
                      <td className="text-xs text-slate-500">{j.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Chart of Accounts' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Balance</th></tr></thead>
                <tbody>
                  {COA.map(a => (
                    <tr key={a.code}>
                      <td><code className="text-xs font-mono text-violet-700 font-bold">{a.code}</code></td>
                      <td className="font-semibold text-slate-800">{a.name}</td>
                      <td><span className={`status-badge ${TYPE_STYLE[a.type]}`}>{a.type}</span></td>
                      <td className={`font-mono text-xs font-bold ${a.type === 'Expense' || a.type === 'Liability' ? 'text-rose-600' : 'text-emerald-700'}`}>AED {a.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Bank Reconciliation' && (
            <div>
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2">
                  <p className="text-xs text-slate-400">Bank Balance</p>
                  <p className="text-lg font-black text-slate-800">AED 142,470</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2">
                  <p className="text-xs text-slate-400">Book Balance</p>
                  <p className="text-lg font-black text-slate-800">AED 142,000</p>
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2">
                  <p className="text-xs text-rose-400">Unreconciled</p>
                  <p className="text-lg font-black text-rose-700">AED 470</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Date</th><th>Description</th><th>Bank Amount</th><th>Book Amount</th><th>Difference</th><th>Status</th></tr></thead>
                  <tbody>
                    {RECON.map(r => (
                      <tr key={r.id}>
                        <td className="text-xs text-slate-500">{r.date}</td>
                        <td className="font-semibold text-slate-800">{r.description}</td>
                        <td className="font-mono text-xs text-slate-700">AED {r.bankAmt.toLocaleString()}</td>
                        <td className="font-mono text-xs text-slate-700">{r.bookAmt > 0 ? `AED ${r.bookAmt.toLocaleString()}` : '—'}</td>
                        <td className={`font-mono text-xs font-bold ${r.diff === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.diff === 0 ? '✓ 0' : `AED ${r.diff}`}</td>
                        <td><span className={`status-badge ${r.status === 'matched' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'VAT Summary' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
                <p className="text-xs text-sky-600 font-bold uppercase tracking-wider mb-1">VAT Period</p>
                <p className="text-base font-black text-sky-800">{VAT.period}</p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-700">AED {VAT.outputVAT.toLocaleString()}</p>
                  <p className="text-xs font-bold text-emerald-600 mt-1">Output VAT (Collected)</p>
                  <p className="text-xs text-slate-500">On sales of AED 385,000</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                  <p className="text-2xl font-black text-rose-700">AED {VAT.inputVAT.toLocaleString()}</p>
                  <p className="text-xs font-bold text-rose-600 mt-1">Input VAT (Reclaimable)</p>
                  <p className="text-xs text-slate-500">On purchases of AED 168,000</p>
                </div>
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-center">
                  <p className="text-2xl font-black text-violet-700">AED {VAT.net.toLocaleString()}</p>
                  <p className="text-xs font-bold text-violet-600 mt-1">Net VAT Payable</p>
                  <p className="text-xs text-slate-500">Due by 28 July 2026</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'P&L Report' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Profit & Loss — May 2026 (YTD). All amounts in AED.</p>
              <div className="max-w-lg space-y-1">
                {PNL.map((row, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${row.isTotal ? 'bg-slate-100 border border-slate-200' : ''}`} style={{ paddingLeft: `${(row.indent * 16) + 12}px` }}>
                    <span className={`text-sm ${row.isTotal ? 'font-black text-slate-800' : 'text-slate-600'}`}>{row.line}</span>
                    <span className={`text-sm font-mono font-bold ${row.isTotal ? 'text-slate-800' : row.amount >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {row.amount < 0 ? `(${Math.abs(row.amount).toLocaleString()})` : row.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 max-w-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-800">Net Profit Margin</span>
                  <span className="text-xl font-black text-emerald-700">{((PNL.find(p=>p.line==='Net Profit').amount / revenue)*100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
