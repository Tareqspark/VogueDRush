import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

const TABS = ['Purchase Orders', 'Goods Receiving', '3-Way Match', 'Invoices', 'Returns', 'Landed Cost'];

const PATH_MAP = {
  '':             'Purchase Orders',
  'orders':       'Purchase Orders',
  'receiving':    'Goods Receiving',
  'matching':     '3-Way Match',
  'invoices':     'Invoices',
  'returns':      'Returns',
  'landed-cost':  'Landed Cost',
};
const TAB_PATH = {
  'Purchase Orders':  'orders',
  'Goods Receiving':  'receiving',
  '3-Way Match':      'matching',
  'Invoices':         'invoices',
  'Returns':          'returns',
  'Landed Cost':      'landed-cost',
};

const POS = [
  { id: 1, poNumber: 'PO-2026-05-013', supplier: 'Fresh Farm Ltd.',    date: '2026-05-05', expected: '2026-05-08', items: 8,  total: 15200.00, status: 'draft',           by: 'System (Auto)' },
  { id: 2, poNumber: 'PO-2026-05-012', supplier: 'Agro Foods',         date: '2026-05-04', expected: '2026-05-07', items: 6,  total: 8250.00,  status: 'confirmed',       by: 'Admin' },
  { id: 3, poNumber: 'PO-2026-05-011', supplier: 'Fresh Farm Ltd.',    date: '2026-05-03', expected: '2026-05-06', items: 4,  total: 12400.00, status: 'partial_receipt', by: 'Manager' },
  { id: 4, poNumber: 'PO-2026-05-010', supplier: 'Dairy Direct',       date: '2026-05-02', expected: '2026-05-05', items: 3,  total: 5600.00,  status: 'received',        by: 'Admin' },
  { id: 5, poNumber: 'PO-2026-05-009', supplier: 'Mediterranean Co.',  date: '2026-05-01', expected: '2026-05-04', items: 2,  total: 3700.00,  status: 'received',        by: 'Admin' },
  { id: 6, poNumber: 'PO-2026-04-085', supplier: 'Grain Masters',      date: '2026-04-28', expected: '2026-05-01', items: 5,  total: 9800.00,  status: 'cancelled',       by: 'Manager' },
];

const GRNS = [
  { id: 1, grnNumber: 'GRN-2026-047', po: 'PO-2026-05-010', supplier: 'Dairy Direct',      date: '2026-05-04', lines: 3, received: 3, variance: 0,  status: 'completed' },
  { id: 2, grnNumber: 'GRN-2026-046', po: 'PO-2026-05-011', supplier: 'Fresh Farm Ltd.',   date: '2026-05-03', lines: 4, received: 3, variance: -1, status: 'partial' },
  { id: 3, grnNumber: 'GRN-2026-045', po: 'PO-2026-05-009', supplier: 'Mediterranean Co.',  date: '2026-05-02', lines: 2, received: 2, variance: 0,  status: 'completed' },
  { id: 4, grnNumber: 'GRN-2026-044', po: 'PO-2026-04-080', supplier: 'Agro Foods',         date: '2026-04-30', lines: 6, received: 6, variance: 0,  status: 'completed' },
];

const INVOICES = [
  { id: 1, invNumber: 'INV-DC-089',  supplier: 'Dairy Direct',      date: '2026-05-04', amount: 5600.00,  match: 'matched',  due: '2026-06-03', status: 'approved', daysLeft: 29 },
  { id: 2, invNumber: 'INV-FF-234',  supplier: 'Fresh Farm Ltd.',   date: '2026-05-03', amount: 9300.00,  match: 'variance', due: '2026-05-18', status: 'hold',     daysLeft: 13 },
  { id: 3, invNumber: 'INV-MC-056',  supplier: 'Mediterranean Co.', date: '2026-05-02', amount: 3700.00,  match: 'matched',  due: '2026-05-17', status: 'paid',     daysLeft: 0 },
  { id: 4, invNumber: 'INV-AF-178',  supplier: 'Agro Foods',        date: '2026-04-15', amount: 6800.00,  match: 'matched',  due: '2026-05-01', status: 'overdue',  daysLeft: -4 },
  { id: 5, invNumber: 'INV-GM-033',  supplier: 'Grain Masters',     date: '2026-04-10', amount: 4200.00,  match: 'matched',  due: '2026-04-25', status: 'overdue',  daysLeft: -10 },
];

const RETURNS = [
  { id: 1, ref: 'RET-2026-012', po: 'PO-2026-04-080', supplier: 'Fresh Farm Ltd.',  date: '2026-05-01', items: 2, amount: 840.00,  reason: 'quality',     status: 'approved' },
  { id: 2, ref: 'RET-2026-011', po: 'PO-2026-04-075', supplier: 'Dairy Direct',     date: '2026-04-28', items: 1, amount: 420.00,  reason: 'expired',     status: 'received' },
  { id: 3, ref: 'RET-2026-010', po: 'PO-2026-04-070', supplier: 'Agro Foods',       date: '2026-04-25', items: 3, amount: 1260.00, reason: 'wrong_item',  status: 'pending' },
];

const PO_STYLE   = { draft: 'bg-slate-100 text-slate-600', confirmed: 'bg-sky-100 text-sky-700', partial_receipt: 'bg-amber-100 text-amber-700', received: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-rose-100 text-rose-700' };
const INV_STYLE  = { approved: 'bg-emerald-100 text-emerald-700', hold: 'bg-amber-100 text-amber-700', paid: 'bg-slate-100 text-slate-600', overdue: 'bg-rose-100 text-rose-700' };
const RET_STYLE  = { approved: 'bg-emerald-50 text-emerald-700', received: 'bg-sky-50 text-sky-700', pending: 'bg-amber-50 text-amber-700' };

export default function Purchase() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath  = location.pathname.replace(/^\/purchase\/?/, '');
  const tab      = PATH_MAP[subPath] || 'Purchase Orders';
  const setTab   = (t) => navigate(`/purchase/${TAB_PATH[t]}`);

  const activePOValue    = POS.filter(p => ['confirmed', 'partial_receipt'].includes(p.status)).reduce((s, p) => s + p.total, 0);
  const pendingGRN       = POS.filter(p => p.status === 'confirmed').length;
  const overdueAmount    = INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const returnValue      = RETURNS.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Purchase Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module B · PO Lifecycle · GRN · 3-Way Match · Invoices · Returns · Landed Cost</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Create PO</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active PO Value',   val: `AED ${(activePOValue/1000).toFixed(1)}K`, sub: `${POS.filter(p=>['confirmed','partial_receipt'].includes(p.status)).length} open POs`, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
          { label: 'Pending GRN',       val: pendingGRN,                                sub: 'Awaiting receipt',      color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Invoice Overdue',   val: `AED ${overdueAmount.toLocaleString()}`,   sub: '2 suppliers overdue',   color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
          { label: 'Return Value MTD',  val: `AED ${returnValue.toLocaleString()}`,     sub: `${RETURNS.length} returns`, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
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
          {tab === 'Purchase Orders' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>PO Number</th><th>Supplier</th><th>PO Date</th><th>Expected Delivery</th><th>Items</th><th>Total</th><th>Status</th><th>Created By</th></tr></thead>
                <tbody>
                  {POS.map(p => (
                    <tr key={p.id}>
                      <td><code className="text-xs text-sky-700 font-mono font-bold">{p.poNumber}</code></td>
                      <td className="font-semibold text-slate-800">{p.supplier}</td>
                      <td className="text-xs text-slate-500">{p.date}</td>
                      <td className="text-xs text-slate-500">{p.expected}</td>
                      <td className="text-center font-bold text-slate-700">{p.items}</td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {p.total.toLocaleString()}</td>
                      <td><span className={`status-badge ${PO_STYLE[p.status]}`}>{p.status.replace('_', ' ')}</span></td>
                      <td className="text-xs text-slate-500">{p.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Goods Receiving' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Match received quantities against confirmed POs. Batch/expiry captured at line level.</p>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>GRN Number</th><th>PO Reference</th><th>Supplier</th><th>Date</th><th>Lines</th><th>Received</th><th>Variance</th><th>Status</th></tr></thead>
                  <tbody>
                    {GRNS.map(g => (
                      <tr key={g.id}>
                        <td><code className="text-xs text-sky-700 font-mono font-bold">{g.grnNumber}</code></td>
                        <td><code className="text-xs text-violet-700 font-mono">{g.po}</code></td>
                        <td className="font-semibold text-slate-800">{g.supplier}</td>
                        <td className="text-xs text-slate-500">{g.date}</td>
                        <td className="text-center text-slate-600">{g.lines}</td>
                        <td className="text-center font-bold text-emerald-600">{g.received}</td>
                        <td className="text-center font-bold">
                          <span className={g.variance === 0 ? 'text-emerald-600' : 'text-rose-600'}>{g.variance === 0 ? '✓' : g.variance}</span>
                        </td>
                        <td><span className={`status-badge ${g.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{g.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Invoices' && (
            <div>
              {/* AP Aging buckets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Current (< 30d)', amount: 'AED 5,600', count: 1, style: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
                  { label: '30 – 60 days',    amount: 'AED 9,300', count: 1, style: 'border-amber-200 bg-amber-50 text-amber-700' },
                  { label: '60 – 90 days',    amount: 'AED 0',     count: 0, style: 'border-slate-200 bg-slate-50 text-slate-400' },
                  { label: 'Overdue 90+',     amount: 'AED 11,000',count: 2, style: 'border-rose-200 bg-rose-50 text-rose-700' },
                ].map(b => (
                  <div key={b.label} className={`rounded-xl border p-3 ${b.style}`}>
                    <p className="text-lg font-black">{b.amount}</p>
                    <p className="text-xs font-semibold">{b.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{b.count} invoices</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Invoice #</th><th>Supplier</th><th>Date</th><th>Amount</th><th>3-Way Match</th><th>Due Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {INVOICES.map(inv => (
                      <tr key={inv.id}>
                        <td><code className="text-xs text-sky-700 font-mono">{inv.invNumber}</code></td>
                        <td className="font-semibold text-slate-800">{inv.supplier}</td>
                        <td className="text-xs text-slate-500">{inv.date}</td>
                        <td className="font-mono text-xs font-bold text-slate-700">AED {inv.amount.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <DocumentCheckIcon className={`h-4 w-4 ${inv.match === 'matched' ? 'text-emerald-600' : 'text-rose-500'}`} />
                            <span className={`status-badge ${inv.match === 'matched' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{inv.match}</span>
                          </div>
                        </td>
                        <td className={`text-xs font-semibold ${inv.daysLeft < 0 ? 'text-rose-600' : inv.daysLeft < 14 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {inv.due} {inv.daysLeft < 0 ? `(${Math.abs(inv.daysLeft)}d overdue)` : inv.daysLeft > 0 ? `(${inv.daysLeft}d)` : ''}
                        </td>
                        <td><span className={`status-badge ${INV_STYLE[inv.status]}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Returns' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Return Ref</th><th>Original PO</th><th>Supplier</th><th>Date</th><th>Items</th><th>Return Amount</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {RETURNS.map(r => (
                    <tr key={r.id}>
                      <td><code className="text-xs text-sky-700 font-mono font-bold">{r.ref}</code></td>
                      <td><code className="text-xs text-violet-700 font-mono">{r.po}</code></td>
                      <td className="font-semibold text-slate-800">{r.supplier}</td>
                      <td className="text-xs text-slate-500">{r.date}</td>
                      <td className="text-center">{r.items}</td>
                      <td className="font-mono text-xs font-bold text-rose-600">AED {r.amount.toLocaleString()}</td>
                      <td><span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.reason.replace('_', ' ')}</span></td>
                      <td><span className={`status-badge ${RET_STYLE[r.status]}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === '3-Way Match' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Perfect Match', val: '18', sub: 'PO = GRN = Invoice', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  { label: 'Qty Variance',  val: '4',  sub: 'GRN ≠ PO qty',        color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200'  },
                  { label: 'Price Variance',val: '2',  sub: 'Invoice ≠ PO price',  color: 'text-rose-700',   bg: 'bg-rose-50',    border: 'border-rose-200'   },
                ].map(k => (
                  <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
                    <p className={`text-3xl font-black ${k.color}`}>{k.val}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
                    <p className="text-xs text-slate-500">{k.sub}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>PO Ref</th><th>GRN Ref</th><th>Invoice Ref</th><th>PO Qty</th><th>GRN Qty</th><th>Inv Qty</th><th>PO Price</th><th>Inv Price</th><th>Match Status</th></tr></thead>
                  <tbody>
                    {[
                      { po: 'PO-2248', grn: 'GRN-0881', inv: 'INV-5503', poQty: 20, grnQty: 20, invQty: 20, poPrice: 45.00, invPrice: 45.00, status: 'perfect' },
                      { po: 'PO-2247', grn: 'GRN-0880', inv: 'INV-5501', poQty: 50, grnQty: 48, invQty: 50, poPrice: 12.00, invPrice: 12.00, status: 'qty-var' },
                      { po: 'PO-2246', grn: 'GRN-0878', inv: 'INV-5498', poQty: 10, grnQty: 10, invQty: 10, poPrice: 95.00, invPrice: 98.50, status: 'price-var' },
                      { po: 'PO-2245', grn: 'GRN-0877', inv: 'INV-5495', poQty: 30, grnQty: 30, invQty: 30, poPrice: 22.00, invPrice: 22.00, status: 'perfect' },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td><code className="text-xs text-sky-700">{r.po}</code></td>
                        <td><code className="text-xs text-slate-600">{r.grn}</code></td>
                        <td><code className="text-xs text-slate-600">{r.inv}</code></td>
                        <td className="text-xs font-mono text-slate-700">{r.poQty}</td>
                        <td className={`text-xs font-mono font-bold ${r.grnQty !== r.poQty ? 'text-amber-700' : 'text-slate-700'}`}>{r.grnQty}</td>
                        <td className={`text-xs font-mono font-bold ${r.invQty !== r.grnQty ? 'text-amber-700' : 'text-slate-700'}`}>{r.invQty}</td>
                        <td className="text-xs font-mono text-slate-700">AED {r.poPrice}</td>
                        <td className={`text-xs font-mono font-bold ${r.invPrice !== r.poPrice ? 'text-rose-700' : 'text-slate-700'}`}>AED {r.invPrice}</td>
                        <td><span className={`status-badge ${ r.status === 'perfect' ? 'bg-emerald-50 text-emerald-700' : r.status === 'qty-var' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700' }`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Landed Cost' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>GRN Ref</th><th>Supplier</th><th>Base Cost</th><th>Freight</th><th>Customs</th><th>Handling</th><th>Total Landed</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {[
                    { grn: 'GRN-0881', supplier: 'Fresh Farm Ltd.',   base: 900.00,  freight: 45.00, customs: 0,     handling: 20.00, method: 'Weight', status: 'posted'  },
                    { grn: 'GRN-0880', supplier: 'Dairy Direct',      base: 576.00,  freight: 30.00, customs: 0,     handling: 15.00, method: 'Value',  status: 'posted'  },
                    { grn: 'GRN-0878', supplier: 'Mediterranean Co.', base: 950.00,  freight: 80.00, customs: 45.00, handling: 25.00, method: 'Weight', status: 'pending' },
                    { grn: 'GRN-0877', supplier: 'Grain Masters',     base: 660.00,  freight: 25.00, customs: 0,     handling: 10.00, method: 'Qty',    status: 'posted'  },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td><code className="text-xs text-sky-700">{r.grn}</code></td>
                      <td className="text-xs font-semibold text-slate-700">{r.supplier}</td>
                      <td className="font-mono text-xs text-slate-700">AED {r.base.toFixed(2)}</td>
                      <td className="font-mono text-xs text-slate-500">AED {r.freight.toFixed(2)}</td>
                      <td className="font-mono text-xs text-slate-500">{r.customs ? `AED ${r.customs.toFixed(2)}` : '—'}</td>
                      <td className="font-mono text-xs text-slate-500">AED {r.handling.toFixed(2)}</td>
                      <td className="font-mono text-xs font-black text-emerald-700">AED {(r.base + r.freight + r.customs + r.handling).toFixed(2)}</td>
                      <td className="text-xs text-slate-500">{r.method}</td>
                      <td><span className={`status-badge ${ r.status === 'posted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700' }`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
