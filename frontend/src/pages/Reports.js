import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

// ─── Theme constants ─────────────────────────────────────────────
const T = {
  badge:      'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
  card:       'bg-white border border-gray-200 rounded-xl shadow-sm',
  input:      'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent',
  select:     'px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400',
  btnPrimary: 'inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors',
  btnGhost:   'inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors',
  tabActive:  'bg-white border-l-4 border-l-red-600 text-red-700 font-semibold',
  tabInactive:'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  rowHover:   'hover:bg-red-50',
};
const PIE_COLORS = ['#DC2626','#2563EB','#16A34A','#D97706','#7C3AED','#0891B2'];
const fmt = (n, dec = 2) => parseFloat(n || 0).toFixed(dec);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '—';
const TYPE_LABEL = { dine_in:'Dine-in', delivery:'Delivery', direct:'Takeaway' };
const PAY_BADGE  = { cash:'bg-emerald-100 text-emerald-800', card:'bg-sky-100 text-sky-800', bkash:'bg-pink-100 text-pink-800', nagad:'bg-orange-100 text-orange-800' };

// ─── Utilities ───────────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row =>
    keys.map(k => { const v = row[k] ?? ''; return typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v; }).join(',')
  )].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function printSection(ref, title) {
  const content = ref.current?.innerHTML;
  if (!content) return;
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#111827;padding:20px;margin:0}
      h2{margin:0 0 4px;font-size:16px;color:#111827}.sub{color:#6b7280;font-size:11px;margin:0 0 12px;display:block}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f3f4f6;border:1px solid #e5e7eb;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700}
      td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px;color:#374151}
      tr:nth-child(even) td{background:#fafafa}
      .sum-row td{font-weight:bold;background:#fee2e2!important;border-top:2px solid #dc2626;color:#991b1b}
      .no-print{display:none!important}
      @page{margin:15mm}
    </style>
  </head><body>${content}</body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
}

// ─── Shared Components ───────────────────────────────────────────
function DateBar({ start, end, setStart, setEnd, onToday, onYesterday, onLast7, onThisMonth, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
      <input type="date" value={start} onChange={e => setStart(e.target.value)} className={T.input}/>
      <span className="text-gray-400">—</span>
      <input type="date" value={end}   onChange={e => setEnd(e.target.value)}   className={T.input}/>
      <button onClick={onToday}     className={T.btnGhost}>Today</button>
      <button onClick={onYesterday} className={T.btnGhost}>Yesterday</button>
      <button onClick={onLast7}     className={T.btnGhost}>Last 7d</button>
      <button onClick={onThisMonth} className={T.btnGhost}>This Month</button>
      {children}
    </div>
  );
}
function SummaryCard({ label, value, color = 'text-red-600' }) {
  return (
    <div className={`${T.card} p-4`}>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs font-bold text-gray-800 mt-0.5">{label}</p>
    </div>
  );
}
function Th({ children, right }) {
  return <th className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 border-b border-gray-200 ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, right, mono, bold }) {
  return <td className={`px-3 py-2.5 text-sm border-b border-gray-100 ${right ? 'text-right' : ''} ${mono ? 'font-mono' : ''} ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{children}</td>;
}
function SumRow({ children }) { return <tr className="sum-row bg-red-50 border-t-2 border-red-600">{children}</tr>; }
function EmptyState({ msg = 'No data for this period.' }) {
  return <div className="py-16 text-center text-gray-400"><p className="font-medium">{msg}</p></div>;
}

// ─── Order Detail Modal (shared across reports) ───────────────────
function OrderDetailModal({ detail, isFetching, onClose }) {
  const order    = detail?.order;
  const items    = detail?.items    || [];
  const payments = detail?.payments || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900">
            Order Detail {order ? `— ${order.order_number}` : ''}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 font-bold text-lg transition-colors">✕</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {isFetching && !order ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : !order ? (
            <p className="text-gray-400 text-sm text-center py-10">Order not found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400 text-xs block">Order No</span><span className="font-mono font-black text-gray-800">{order.order_number}</span></div>
                <div><span className="text-gray-400 text-xs block">Status</span><span className={`inline-block px-2 py-0.5 rounded text-xs font-bold capitalize ${order.status === 'done' ? 'bg-green-100 text-green-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{order.status}</span></div>
                <div><span className="text-gray-400 text-xs block">Type</span><span className="font-semibold capitalize text-gray-700">{order.order_type === 'direct' ? 'Takeaway' : (order.order_type || '').replace('_', ' ')}</span></div>
                <div><span className="text-gray-400 text-xs block">Total</span><span className="font-bold text-sky-600">৳{parseFloat(order.total_amount || 0).toFixed(2)}</span></div>
                {order.table_number && <div><span className="text-gray-400 text-xs block">Table</span><span className="font-semibold text-gray-700">{order.table_number}</span></div>}
                {order.customer_name && <div><span className="text-gray-400 text-xs block">Customer</span><span className="font-semibold text-gray-700">{order.customer_name}</span></div>}
                {order.customer_phone && <div><span className="text-gray-400 text-xs block">Phone</span><span className="font-semibold text-gray-700">{order.customer_phone}</span></div>}
                <div className="col-span-2"><span className="text-gray-400 text-xs block">Placed At</span><span className="font-semibold text-gray-700">{order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</span></div>
                {parseFloat(order.discount_amount) > 0 && <div><span className="text-gray-400 text-xs block">Discount</span><span className="font-semibold text-red-600">-৳{parseFloat(order.discount_amount).toFixed(2)}</span></div>}
                {parseFloat(order.vat_amount) > 0 && <div><span className="text-gray-400 text-xs block">VAT</span><span className="font-semibold text-gray-700">৳{parseFloat(order.vat_amount).toFixed(2)}</span></div>}
                {order.cancellation_reason && (
                  <div className="col-span-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-sm text-rose-700">
                    <span className="font-bold">Cancel Reason: </span>{order.cancellation_reason}
                  </div>
                )}
              </div>
              {items.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl text-sm">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between px-3 py-2">
                        <span className="text-gray-700">{item.quantity}× {item.menu_item_name || item.item_name || item.name}</span>
                        <span className="font-semibold text-gray-800">৳{parseFloat(item.subtotal || item.total_price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {payments.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payments</p>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl text-sm">
                    {payments.map((p, i) => (
                      <div key={i} className="flex justify-between px-3 py-2">
                        <span className="capitalize text-gray-700">{p.payment_method}</span>
                        <span className="font-semibold text-gray-800">৳{parseFloat(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function useOrderModal(api) {
  const [orderId, setOrderId] = useState(null);
  const { data: detail, isFetching } = useQuery(
    ['rpt-order-detail', orderId],
    () => api.get(`/orders/${orderId}`).then(r => r.data),
    { enabled: !!orderId }
  );
  const modal = orderId ? (
    <OrderDetailModal detail={detail} isFetching={isFetching} onClose={() => setOrderId(null)} />
  ) : null;
  return [setOrderId, modal];
}

function OrderLink({ id, orderNumber, onClick }) {
  return (
    <button onClick={() => id && onClick(id)}
      className={`font-mono font-black text-left leading-none ${id ? 'text-sky-600 hover:text-sky-800 hover:underline cursor-pointer' : 'text-gray-700 cursor-default'}`}>
      {orderNumber}
    </button>
  );
}

// ─── A. Daily Sales Summary ──────────────────────────────────────
function DailySalesSummary({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };
  const [openOrder, orderModal] = useOrderModal(api);

  const { data, isLoading } = useQuery(
    ['rpt-daily-sales', start, end],
    () => api.get('/reports/today-revenue', { params: { start_date: start, end_date: end, limit: 500 } }).then(r => r.data)
  );
  const orders = data?.orders  || [];
  const t      = data?.totals  || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(orders, `daily-sales-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Daily Sales Summary')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Daily Sales Summary Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
            <SummaryCard label="Total Revenue"  value={`৳${fmt(t.total_revenue)}`}/>
            <SummaryCard label="Total Orders"   value={t.total_orders||0} color="text-blue-600"/>
            <SummaryCard label="Total VAT"      value={`৳${fmt(t.total_vat)}`} color="text-amber-600"/>
            <SummaryCard label="Total Discount" value={`৳${fmt(t.total_discount)}`} color="text-gray-600"/>
          </div>
          {orders.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Order No</Th><Th>Served By</Th><Th>Customer</Th><Th>Type</Th><Th>Payment</Th><Th right>Total</Th><Th right>Discount</Th><Th right>VAT</Th><Th right>Paid</Th><Th>Time</Th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className={T.rowHover}>
                      <Td mono><OrderLink id={o.id} orderNumber={o.order_number} onClick={openOrder} /></Td>
                      <Td><span className="font-medium text-sky-700">{o.waiter_full_name||o.waiter_name||'—'}</span></Td>
                      <Td>{o.customer_name||'—'}</Td>
                      <Td><span className={`${T.badge} bg-gray-100 text-gray-700`}>{TYPE_LABEL[o.order_type]||o.order_type}</span></Td>
                      <Td><span className={`${T.badge} ${PAY_BADGE[o.payment_method]||'bg-gray-100 text-gray-600'}`}>{o.payment_method||'—'}</span></Td>
                      <Td right bold>৳{fmt(o.total_amount)}</Td>
                      <Td right>৳{fmt(o.discount_amount)}</Td>
                      <Td right>৳{fmt(o.vat_amount)}</Td>
                      <Td right>৳{fmt(o.paid_amount)}</Td>
                      <Td>{fmtDate(o.created_at)} {fmtTime(o.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td colSpan={5} className="px-3 py-2 text-sm font-bold">GRAND TOTAL ({orders.length} orders)</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.total_revenue)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.total_discount)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.total_vat)}</td>
                    <td colSpan={2}/>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        {orderModal}
        </div>
      )}
    </div>
  );
}

// ─── B. Cancel Report ────────────────────────────────────────────
function CancelReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };
  const [openOrder, orderModal] = useOrderModal(api);

  const { data, isLoading } = useQuery(
    ['rpt-cancel', start, end],
    () => api.get('/orders/cancelled', { params: { start_date: start, end_date: end, limit: 500 } }).then(r => r.data)
  );
  const orders = data?.orders || [];
  const totalValue = orders.reduce((s, o) => s + parseFloat(o.total_amount||0), 0);

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(orders, `cancel-report-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Daily Cancel Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Daily Cancel Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-3 gap-3 mb-4 no-print">
            <SummaryCard label="Total Cancelled" value={orders.length} color="text-red-600"/>
            <SummaryCard label="Total Value Lost" value={`৳${fmt(totalValue)}`} color="text-gray-700"/>
            <SummaryCard label="Avg Order Value"  value={`৳${orders.length ? fmt(totalValue/orders.length) : '0.00'}`} color="text-gray-500"/>
          </div>
          {orders.length === 0 ? <EmptyState msg="No cancelled orders for this period."/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Order No</Th><Th>Customer</Th><Th>Type</Th><Th>Cancel Reason</Th><Th>Cancelled By</Th><Th right>Amount</Th><Th>Date/Time</Th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-red-50">
                      <Td mono><OrderLink id={o.id} orderNumber={o.order_number} onClick={openOrder} /></Td>
                      <Td>{o.customer_name||'—'}</Td>
                      <Td><span className={`${T.badge} bg-gray-100 text-gray-700`}>{TYPE_LABEL[o.order_type]||o.order_type}</span></Td>
                      <Td><span className="text-red-700">{o.cancellation_reason||'—'}</span></Td>
                      <Td>{o.waiter_full_name||o.waiter_name||'—'}</Td>
                      <Td right bold>৳{fmt(o.total_amount)}</Td>
                      <Td>{fmtDate(o.created_at)} {fmtTime(o.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td colSpan={5} className="px-3 py-2 text-sm font-bold">TOTAL CANCELLED ({orders.length})</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(totalValue)}</td>
                    <td/>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
          {orderModal}
        </div>
      )}
    </div>
  );
}

// ─── C. Hold/Due Report ──────────────────────────────────────────
function HoldDueReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };
  const [openOrder, orderModal] = useOrderModal(api);

  const { data, isLoading } = useQuery(
    ['rpt-hold', start, end],
    () => api.get('/reports/hold-report', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const orders = data?.orders || [];
  const t      = data?.totals || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => printSection(ref, 'Hold/Due Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Hold / Due Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 gap-3 mb-4 no-print">
            <SummaryCard label="Hold Orders" value={t.count||0}/>
            <SummaryCard label="Total Value" value={`৳${fmt(t.total_value)}`} color="text-gray-700"/>
          </div>
          {orders.length === 0 ? <EmptyState msg="No hold orders for this period."/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Order No</Th><Th>Customer</Th><Th>Type</Th><Th>Table</Th><Th>Waiter</Th><Th right>Amount</Th><Th>Date/Time</Th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-orange-50">
                      <Td mono><OrderLink id={o.id} orderNumber={o.order_number} onClick={openOrder} /></Td>
                      <Td>{o.customer_name||'—'}</Td>
                      <Td><span className={`${T.badge} bg-gray-100 text-gray-700`}>{TYPE_LABEL[o.order_type]||o.order_type}</span></Td>
                      <Td>{o.table_number||'—'}</Td>
                      <Td>{o.waiter_name||'—'}</Td>
                      <Td right bold>৳{fmt(o.total_amount)}</Td>
                      <Td>{fmtDate(o.created_at)} {fmtTime(o.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td colSpan={5} className="px-3 py-2 text-sm font-bold">TOTAL ({orders.length} orders)</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.total_value)}</td>
                    <td/>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
          {orderModal}
        </div>
      )}
    </div>
  );
}

// ─── D. Category Sales ───────────────────────────────────────────
function CategorySalesReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-6*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-cat', start, end],
    () => api.get('/reports/menu-performance', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const cats = data?.category_performance || [];

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(cats, `category-sales-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Category Wise Sales')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Category Wise Sales Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          {cats.length > 0 && (
            <div className="mb-4 no-print" style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cats.map(c=>({name:c.category_name, revenue:parseFloat(c.total_revenue||0)}))} margin={{top:4,right:12,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:'#6b7280'}}/>
                  <YAxis tick={{fontSize:11,fill:'#6b7280'}}/>
                  <Tooltip contentStyle={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8}}/>
                  <Bar dataKey="revenue" fill="#DC2626" radius={[4,4,0,0]} name="Revenue (৳)"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {cats.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Category</Th><Th right>Qty Sold</Th><Th right>Orders</Th><Th right>Revenue</Th></tr></thead>
                <tbody>
                  {cats.map((c,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-semibold text-gray-900">{c.category_name}</span></Td>
                      <Td right>{parseInt(c.total_quantity||0)}</Td>
                      <Td right>{c.orders_count}</Td>
                      <Td right bold>৳{fmt(c.total_revenue)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td className="px-3 py-2 text-sm font-bold">TOTAL</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{cats.reduce((s,c)=>s+parseInt(c.total_quantity||0),0)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{cats.reduce((s,c)=>s+parseInt(c.orders_count||0),0)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(cats.reduce((s,c)=>s+parseFloat(c.total_revenue||0),0))}</td>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── E. Payment Methods ──────────────────────────────────────────
function PaymentMethodsReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-6*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-payment-methods', start, end],
    () => api.get('/reports/payment-methods', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const breakdown = data?.payment_breakdown || [];
  const trends    = data?.payment_trends    || [];
  const dateMap   = {};
  trends.forEach(tr => {
    if (!dateMap[tr.payment_date]) dateMap[tr.payment_date] = {cash:0,card:0,bkash:0,nagad:0};
    dateMap[tr.payment_date][tr.payment_method] = parseFloat(tr.total_amount||0);
  });
  const dateRows = Object.entries(dateMap)
    .map(([date, m]) => ({ date, ...m, total:(m.cash||0)+(m.card||0)+(m.bkash||0)+(m.nagad||0) }))
    .sort((a,b) => b.date.localeCompare(a.date));

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(dateRows, `payment-methods-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Payment Method Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Payment Method Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
            {['cash','card','bkash','nagad'].map(m => {
              const b = breakdown.find(x => x.payment_method === m);
              return <SummaryCard key={m} label={m.charAt(0).toUpperCase()+m.slice(1)} value={`৳${fmt(b?.total_amount)}`} color={m==='cash'?'text-emerald-600':m==='card'?'text-sky-600':m==='bkash'?'text-pink-600':'text-orange-600'}/>;
            })}
          </div>
          {breakdown.length > 0 && (
            <div className="mb-4 no-print" style={{width:220,height:220}}>
              <PieChart width={220} height={220}>
                <Pie data={breakdown.map(b=>({name:b.payment_method, value:parseFloat(b.total_amount||0)}))} cx={110} cy={110} outerRadius={85} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {breakdown.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </div>
          )}
          {dateRows.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Date</Th><Th right>Cash</Th><Th right>Card</Th><Th right>bKash</Th><Th right>Nagad</Th><Th right>Total</Th></tr></thead>
                <tbody>
                  {dateRows.map((r,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td>{fmtDate(r.date)}</Td>
                      <Td right>৳{fmt(r.cash)}</Td>
                      <Td right>৳{fmt(r.card)}</Td>
                      <Td right>৳{fmt(r.bkash)}</Td>
                      <Td right>৳{fmt(r.nagad)}</Td>
                      <Td right bold>৳{fmt(r.total)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td className="px-3 py-2 text-sm font-bold">TOTAL</td>
                    {['cash','card','bkash','nagad'].map(m => (
                      <td key={m} className="px-3 py-2 text-sm font-bold text-right">৳{fmt(dateRows.reduce((s,r)=>s+(r[m]||0),0))}</td>
                    ))}
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(dateRows.reduce((s,r)=>s+r.total,0))}</td>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── F. VAT Report ───────────────────────────────────────────────
function VATReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-29*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-vat', start, end],
    () => api.get('/reports/vat-report', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const daily = data?.daily  || [];
  const t     = data?.totals || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(daily, `vat-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'VAT Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">VAT Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
            <SummaryCard label="Total Orders"  value={t.total_orders||0} color="text-blue-600"/>
            <SummaryCard label="Gross Revenue" value={`৳${fmt(t.total_revenue)}`}/>
            <SummaryCard label="Net Sales"     value={`৳${fmt(parseFloat(t.total_revenue||0)-parseFloat(t.total_vat||0))}`} color="text-gray-700"/>
            <SummaryCard label="VAT Collected" value={`৳${fmt(t.total_vat)}`} color="text-amber-600"/>
          </div>
          {daily.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Date</Th><Th right>Orders</Th><Th right>Gross Revenue</Th><Th right>Net (excl VAT)</Th><Th right>VAT Collected</Th></tr></thead>
                <tbody>
                  {daily.map((r,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td>{fmtDate(r.date)}</Td>
                      <Td right>{r.orders}</Td>
                      <Td right>৳{fmt(r.gross)}</Td>
                      <Td right>৳{fmt(parseFloat(r.gross||0)-parseFloat(r.vat_collected||0))}</Td>
                      <Td right bold>৳{fmt(r.vat_collected)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td className="px-3 py-2 text-sm font-bold">TOTAL</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{t.total_orders}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.total_revenue)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(parseFloat(t.total_revenue||0)-parseFloat(t.total_vat||0))}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.total_vat)}</td>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── G. Collection Summary ───────────────────────────────────────
function CollectionSummaryReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-6*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-collection', start, end],
    () => api.get('/reports/collection-summary', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const rows = data?.rows   || [];
  const t    = data?.totals || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(rows, `collection-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Collection Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Collection Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
            <SummaryCard label="Dine-in"    value={`৳${fmt(t.dine_in)}`}    color="text-sky-600"/>
            <SummaryCard label="Delivery"   value={`৳${fmt(t.delivery)}`}   color="text-amber-600"/>
            <SummaryCard label="Takeaway"   value={`৳${fmt(t.takeaway)}`}   color="text-emerald-600"/>
            <SummaryCard label="Grand Total" value={`৳${fmt(t.grand_total)}`}/>
          </div>
          {rows.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Date</Th><Th right>Dine-in</Th><Th right>Delivery</Th><Th right>Takeaway</Th><Th right>Daily Total</Th></tr></thead>
                <tbody>
                  {rows.map((r,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td>{fmtDate(r.date)}</Td>
                      <Td right>৳{fmt(r.dine_in)}</Td>
                      <Td right>৳{fmt(r.delivery)}</Td>
                      <Td right>৳{fmt(r.takeaway)}</Td>
                      <Td right bold>৳{fmt(r.daily_total)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td className="px-3 py-2 text-sm font-bold">GRAND TOTAL</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.dine_in)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.delivery)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.takeaway)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.grand_total)}</td>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── H. Payment Collection ───────────────────────────────────────
function PaymentCollectionReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-6*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-pay-coll', start, end],
    () => api.get('/reports/payment-collection', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const rows = data?.rows   || [];
  const t    = data?.totals || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(rows, `payment-collection-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Payment Collection Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Payment Collection Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
            <SummaryCard label="Cash"  value={`৳${fmt(t.cash)}`}  color="text-emerald-600"/>
            <SummaryCard label="Card"  value={`৳${fmt(t.card)}`}  color="text-sky-600"/>
            <SummaryCard label="bKash" value={`৳${fmt(t.bkash)}`} color="text-pink-600"/>
            <SummaryCard label="Nagad" value={`৳${fmt(t.nagad)}`} color="text-orange-600"/>
          </div>
          {rows.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Date</Th><Th right>Cash</Th><Th right>Card</Th><Th right>bKash</Th><Th right>Nagad</Th><Th right>Daily Total</Th></tr></thead>
                <tbody>
                  {rows.map((r,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td>{fmtDate(r.date)}</Td>
                      <Td right>৳{fmt(r.cash)}</Td>
                      <Td right>৳{fmt(r.card)}</Td>
                      <Td right>৳{fmt(r.bkash)}</Td>
                      <Td right>৳{fmt(r.nagad)}</Td>
                      <Td right bold>৳{fmt(r.daily_total)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td className="px-3 py-2 text-sm font-bold">TOTAL</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.cash)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.card)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.bkash)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.nagad)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.grand_total)}</td>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── I. Discount Report ──────────────────────────────────────────
function DiscountReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-29*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const [view, setView]   = useState('by-user');
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };
  const [openOrder, orderModal] = useOrderModal(api);

  const { data, isLoading } = useQuery(
    ['rpt-discount', start, end],
    () => api.get('/reports/discount-report', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const byUser = data?.by_user || [];
  const orders = data?.orders  || [];
  const t      = data?.totals  || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(view==='by-user'?byUser:orders, `discount-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Discount Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Discount Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end} · {t.orders_with_discount||0} discounted orders · Total ৳{fmt(t.total_discount)}</span>
          <div className="flex gap-2 mb-4 no-print">
            {['by-user','by-order'].map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${view===v?'bg-red-600 text-white':'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {v==='by-user'?'By User':'By Order'}
              </button>
            ))}
          </div>
          {view === 'by-user' ? (
            byUser.length === 0 ? <EmptyState msg="No discounts in this period."/> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><Th>Full Name</Th><Th>Username</Th><Th right>Orders</Th><Th right>Total Discount</Th><Th right>Avg Discount</Th></tr></thead>
                  <tbody>
                    {byUser.map((u,i) => (
                      <tr key={i} className={T.rowHover}>
                        <Td><span className="font-semibold text-gray-900">{u.full_name}</span></Td>
                        <Td mono>{u.username}</Td>
                        <Td right>{u.order_count}</Td>
                        <Td right bold>৳{fmt(u.total_discount)}</Td>
                        <Td right>৳{fmt(u.avg_discount)}</Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <SumRow>
                      <td colSpan={2} className="px-3 py-2 text-sm font-bold">TOTAL</td>
                      <td className="px-3 py-2 text-sm font-bold text-right">{t.orders_with_discount}</td>
                      <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.total_discount)}</td>
                      <td/>
                    </SumRow>
                  </tfoot>
                </table>
              </div>
            )
          ) : (
            orders.length === 0 ? <EmptyState msg="No discounted orders."/> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr><Th>Order No</Th><Th>Customer</Th><Th>Type</Th><Th>Waiter</Th><Th right>Order Total</Th><Th right>Discount</Th><Th>Date</Th></tr></thead>
                  <tbody>
                    {orders.map((o,i) => (
                      <tr key={i} className={T.rowHover}>
                        <Td mono><OrderLink id={o.id} orderNumber={o.order_number} onClick={openOrder} /></Td>
                        <Td>{o.customer_name||'—'}</Td>
                        <Td><span className={`${T.badge} bg-gray-100 text-gray-700`}>{TYPE_LABEL[o.order_type]||o.order_type}</span></Td>
                        <Td>{o.waiter_name}</Td>
                        <Td right>৳{fmt(o.total_amount)}</Td>
                        <Td right bold>৳{fmt(o.discount_amount)}</Td>
                        <Td>{fmtDate(o.created_at)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {orderModal}
        </div>
      )}
    </div>
  );
}

// ─── J. Due Collection ───────────────────────────────────────────
function DueCollectionReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-29*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };
  const [openOrder, orderModal] = useOrderModal(api);

  const { data, isLoading } = useQuery(
    ['rpt-due', start, end],
    () => api.get('/reports/due-collection', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const orders = data?.orders || [];
  const t      = data?.totals || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(orders, `due-collection-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Due Collection Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Due Collection Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-3 gap-3 mb-4 no-print">
            <SummaryCard label="Orders with Due" value={t.count||0}/>
            <SummaryCard label="Total Due"       value={`৳${fmt(t.total_due)}`} color="text-red-600"/>
            <SummaryCard label="Advance Paid"    value={`৳${fmt(t.total_advance)}`} color="text-emerald-600"/>
          </div>
          {orders.length === 0 ? <EmptyState msg="No due amounts for this period."/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Order No</Th><Th>Served By</Th><Th>Customer</Th><Th>Phone</Th><Th right>Order Total</Th><Th right>Advance</Th><Th right>Due</Th><Th>Status</Th><Th>Date</Th></tr></thead>
                <tbody>
                  {orders.map((o,i) => (
                    <tr key={i} className="hover:bg-orange-50">
                      <Td mono><OrderLink id={o.id} orderNumber={o.order_number} onClick={openOrder} /></Td>
                      <Td><span className="font-medium text-sky-700">{o.waiter_full_name||o.waiter_name||'—'}</span></Td>
                      <Td>{o.customer_name||'—'}</Td>
                      <Td mono>{o.delivery_phone||'—'}</Td>
                      <Td right>৳{fmt(o.total_amount)}</Td>
                      <Td right>৳{fmt(o.advance_payment)}</Td>
                      <Td right><span className="font-black text-red-600">৳{fmt(o.due_amount)}</span></Td>
                      <Td><span className={`${T.badge} ${o.delivery_status==='delivered'?'bg-green-100 text-green-800':'bg-orange-100 text-orange-800'}`}>{o.delivery_status}</span></Td>
                      <Td>{fmtDate(o.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td colSpan={4} className="px-3 py-2 text-sm font-bold">TOTAL ({t.count} orders)</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.total_advance)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.total_due)}</td>
                    <td colSpan={2}/>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
          {orderModal}
        </div>
      )}
    </div>
  );
}

// ─── K. User Sales Summary ───────────────────────────────────────
function UserSalesSummary({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-29*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-users', start, end],
    () => api.get('/reports/user-summary', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const users = data?.users || [];

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(users, `user-summary-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'User Wise Sales Summary')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">User Wise Sales Summary</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          {users.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Full Name</Th><Th>Username</Th><Th right>Orders</Th><Th right>Total Sales</Th><Th right>Collected</Th><Th right>Discount Given</Th><Th right>Avg Order</Th></tr></thead>
                <tbody>
                  {users.map((u,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-semibold text-gray-900">{u.full_name}</span></Td>
                      <Td mono>{u.username}</Td>
                      <Td right>{u.orders_completed||0}</Td>
                      <Td right bold>৳{fmt(u.total_sales)}</Td>
                      <Td right>৳{fmt(u.total_collected)}</Td>
                      <Td right>৳{fmt(u.total_discount)}</Td>
                      <Td right>৳{fmt(u.avg_order)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td colSpan={2} className="px-3 py-2 text-sm font-bold">TOTAL</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{users.reduce((s,u)=>s+(parseInt(u.orders_completed)||0),0)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(users.reduce((s,u)=>s+parseFloat(u.total_sales||0),0))}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(users.reduce((s,u)=>s+parseFloat(u.total_collected||0),0))}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(users.reduce((s,u)=>s+parseFloat(u.total_discount||0),0))}</td>
                    <td/>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── L. Yearly Summary ───────────────────────────────────────────
function YearlySummary({ api }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const ref = useRef(null);

  const { data, isLoading } = useQuery(
    ['rpt-yearly', year],
    () => api.get('/reports/yearly-summary', { params: { year } }).then(r => r.data)
  );
  const current  = data?.current_year  || [];
  const previous = data?.previous_year || [];
  const prevMap  = Object.fromEntries(previous.map(p => [p.month, parseFloat(p.revenue||0)]));
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const tableRows = ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,idx) => {
    const found   = current.find(c => c.month === `${year}-${m}`);
    const prevRev = prevMap[`${year-1}-${m}`] || 0;
    const curRev  = parseFloat(found?.revenue || 0);
    const growth  = prevRev > 0 ? ((curRev - prevRev) / prevRev * 100) : null;
    return { month: MONTHS[idx], orders: found?.orders||0, revenue: curRev, vat: parseFloat(found?.vat||0), discount: parseFloat(found?.discount||0), prev: prevRev, growth };
  });
  const chartData = tableRows.filter(r => r.revenue > 0 || r.prev > 0)
    .map(r => ({ month: r.month, current: r.revenue, previous: r.prev }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 no-print">
        <label className="text-sm font-medium text-gray-700">Year:</label>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))} className={T.select} style={{width:120}}>
          {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => exportCSV(tableRows, `yearly-${year}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, `Yearly Summary ${year}`)} className={T.btnPrimary}>🖨 Print</button>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Yearly Sales Summary — {year}</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">Month-to-month comparison vs {year-1}</span>
          {chartData.length > 0 && (
            <div className="mb-4 no-print" style={{height:220}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{top:4,right:12,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="month" tick={{fontSize:11,fill:'#6b7280'}}/>
                  <YAxis tick={{fontSize:11,fill:'#6b7280'}}/>
                  <Tooltip contentStyle={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8}}/>
                  <Legend/>
                  <Bar dataKey="current"  fill="#DC2626" name={`${year}`}   radius={[4,4,0,0]}/>
                  <Bar dataKey="previous" fill="#9CA3AF" name={`${year-1}`} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Month</Th><Th right>Orders</Th><Th right>Revenue {year}</Th><Th right>Revenue {year-1}</Th><Th right>Growth</Th><Th right>VAT</Th><Th right>Discounts</Th></tr></thead>
              <tbody>
                {tableRows.map((r,i) => (
                  <tr key={i} className={T.rowHover}>
                    <Td><span className="font-semibold text-gray-900">{r.month} {year}</span></Td>
                    <Td right>{r.orders||'—'}</Td>
                    <Td right bold>৳{fmt(r.revenue)}</Td>
                    <Td right>৳{fmt(r.prev)}</Td>
                    <Td right>{r.growth !== null ? <span className={`font-bold ${r.growth>=0?'text-green-600':'text-red-600'}`}>{r.growth>=0?'▲':'▼'} {Math.abs(r.growth).toFixed(1)}%</span> : '—'}</Td>
                    <Td right>৳{fmt(r.vat)}</Td>
                    <Td right>৳{fmt(r.discount)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <SumRow>
                  <td className="px-3 py-2 text-sm font-bold">TOTAL {year}</td>
                  <td className="px-3 py-2 text-sm font-bold text-right">{tableRows.reduce((s,r)=>s+(parseInt(r.orders)||0),0)}</td>
                  <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(tableRows.reduce((s,r)=>s+r.revenue,0))}</td>
                  <td className="px-3 py-2 text-sm text-right text-gray-500">৳{fmt(tableRows.reduce((s,r)=>s+r.prev,0))}</td>
                  <td colSpan={3}/>
                </SumRow>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── M. Customer Search ──────────────────────────────────────────
function CustomerSearchReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-29*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const [phone, setPhone] = useState('');
  const [name,  setName]  = useState('');
  const [enabled, setEnabled] = useState(false);
  const ref = useRef(null);

  const { data, isLoading } = useQuery(
    ['rpt-customers', start, end, phone, name],
    () => api.get('/reports/customer-search', { params: { start_date: start, end_date: end, phone: phone||undefined, name: name||undefined } }).then(r => r.data),
    { enabled }
  );
  const customers = data?.customers || [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <input type="date" value={start} onChange={e => setStart(e.target.value)} className={T.input}/>
        <input type="date" value={end}   onChange={e => setEnd(e.target.value)}   className={T.input}/>
        <input type="text" value={name}  onChange={e => setName(e.target.value)}  placeholder="Customer name…"   className={T.input}/>
        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone…" className={`${T.input} w-36`}/>
        <button onClick={() => { setEnabled(false); setTimeout(() => setEnabled(true), 50); }} className={T.btnPrimary}>Search</button>
        {data && <><button onClick={() => exportCSV(customers, 'customer-search')} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Customer Search Report')} className={T.btnGhost}>🖨 Print</button></>}
      </div>
      {!enabled ? (
        <div className="py-16 text-center text-gray-400"><p className="font-medium">Use the filters above and click Search.</p></div>
      ) : isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Customer Search Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end} · {customers.length} customers found</span>
          {customers.length === 0 ? <EmptyState msg="No customers found for these criteria."/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Customer Name</Th><Th>Phone</Th><Th right>Orders</Th><Th right>Total Spent</Th><Th right>Discount</Th><Th right>Due</Th><Th>Last Order</Th></tr></thead>
                <tbody>
                  {customers.map((c,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-semibold text-gray-900">{c.customer_name||'—'}</span></Td>
                      <Td mono>{c.customer_phone||'—'}</Td>
                      <Td right>{c.total_orders}</Td>
                      <Td right bold>৳{fmt(c.total_spent)}</Td>
                      <Td right>৳{fmt(c.total_discount)}</Td>
                      <Td right><span className={parseFloat(c.total_due)>0?'text-red-600 font-bold':''}>৳{fmt(c.total_due)}</span></Td>
                      <Td>{fmtDate(c.last_order)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── N. Delivery Report ──────────────────────────────────────────
function DeliveryReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-6*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-delivery', start, end],
    () => api.get('/reports/delivery', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const ov = data?.overview         || {};
  const sb = data?.status_breakdown || [];

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => printSection(ref, 'Home Delivery Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Home Delivery Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Total Deliveries" value={ov.total_deliveries||0}/>
            <SummaryCard label="Revenue"          value={`৳${fmt(ov.total_revenue)}`}/>
            <SummaryCard label="Delivered"        value={ov.delivered_count||0} color="text-green-600"/>
            <SummaryCard label="Due Amount"       value={`৳${fmt(ov.total_due_amount)}`} color="text-red-600"/>
          </div>
          {sb.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Status</Th><Th right>Count</Th><Th right>Total Value</Th><Th right>Avg Value</Th></tr></thead>
                <tbody>
                  {sb.map((r,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className={`${T.badge} ${r.delivery_status==='delivered'?'bg-green-100 text-green-800':r.delivery_status==='cancelled'?'bg-red-100 text-red-800':'bg-blue-100 text-blue-800'}`}>{r.delivery_status}</span></Td>
                      <Td right>{r.count}</Td>
                      <Td right bold>৳{fmt(r.total_value)}</Td>
                      <Td right>৳{fmt(r.avg_value)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── O. Reservation Report ───────────────────────────────────────
function ReservationReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now()-6*86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const { data, isLoading } = useQuery(
    ['rpt-reservations', start, end],
    () => api.get('/reports/reservations-report', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const res = data?.reservations || [];
  const t   = data?.totals       || {};

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now()-86400000).toISOString().split('T')[0]; ud(y,y); }}
        onLast7={() => ud(new Date(Date.now()-6*86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(res, `reservations-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Reservation Report')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Reservation Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{start} — {end}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
            <SummaryCard label="Total"        value={t.total||0}/>
            <SummaryCard label="Confirmed"    value={t.confirmed||0}  color="text-green-600"/>
            <SummaryCard label="Cancelled"    value={t.cancelled||0}  color="text-red-600"/>
            <SummaryCard label="Total Covers" value={t.total_covers||0} color="text-blue-600"/>
          </div>
          {res.length === 0 ? <EmptyState msg="No reservations for this period."/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Customer</Th><Th>Phone</Th><Th>Date</Th><Th>Time</Th><Th right>Guests</Th><Th>Table</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {res.map((r,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-semibold text-gray-900">{r.customer_name}</span></Td>
                      <Td mono>{r.customer_phone||'—'}</Td>
                      <Td>{fmtDate(r.reservation_date)}</Td>
                      <Td>{r.reservation_time}</Td>
                      <Td right>{r.party_size}</Td>
                      <Td>{r.table_number||'—'}</Td>
                      <Td><span className={`${T.badge} ${r.status==='confirmed'?'bg-green-100 text-green-800':r.status==='cancelled'?'bg-red-100 text-red-800':r.status==='completed'?'bg-blue-100 text-blue-800':'bg-yellow-100 text-yellow-800'}`}>{r.status}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── P. Menu List ────────────────────────────────────────────────
function MenuListReport({ api }) {
  const ref = useRef(null);
  const { data, isLoading } = useQuery(
    ['rpt-menu'],
    () => api.get('/reports/menu-list').then(r => r.data),
    { staleTime: 5*60*1000 }
  );
  const menu = data?.menu || {};
  const cats = Object.keys(menu);
  const flatList = cats.flatMap(cat => menu[cat].map(i => ({ category: cat, ...i })));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 no-print">
        <button onClick={() => exportCSV(flatList, 'menu-list')} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Menu List')} className={T.btnPrimary}>🖨 Print</button>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner/></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Menu List Report</h2>
          <span className="sub text-xs text-gray-500 mb-3 block">{data?.total_items||0} items · {cats.length} categories</span>
          {cats.map(cat => (
            <div key={cat} className="mb-4">
              <div className="bg-gray-800 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-t-lg">{cat}</div>
              <table className="w-full text-sm border border-gray-200 rounded-b-lg overflow-hidden">
                <thead><tr className="bg-gray-50"><Th>Item Name</Th><Th right>Price</Th><Th right>VAT%</Th><Th right>Prep Time</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {menu[cat].map((item,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-medium text-gray-900">{item.name}</span></Td>
                      <Td right>৳{fmt(item.price)}</Td>
                      <Td right>{item.vat_rate}%</Td>
                      <Td right>{item.preparation_time}m</Td>
                      <Td><span className={`${T.badge} ${item.is_available?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{item.is_available?'Available':'Off'}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Donut Ring Stat (like screenshot) ───────────────────────────
function DonutStat({ label, value, trend, color, onClick }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.78; // 78% arc visible
  return (
    <div
      className={`flex flex-col items-center gap-1 ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
      title={onClick ? `Click to view ${label} details` : undefined}
    >
      <div className="relative" style={{ width: 90, height: 90 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          {/* bg arc */}
          <circle cx="45" cy="45" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5"
            strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
            transform="rotate(129 45 45)" />
          {/* colored arc */}
          <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${arc * 0.62} ${circ - arc * 0.62}`} strokeLinecap="round"
            transform="rotate(129 45 45)" />
          {/* colored dot at start of arc */}
          <circle cx={45 + r * Math.cos((129 * Math.PI) / 180)}
                  cy={45 + r * Math.sin((129 * Math.PI) / 180)}
                  r="4" fill={color} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black text-gray-800 leading-tight text-center px-1">{value}</span>
        </div>
      </div>
      <p className={`text-[11px] font-semibold text-center leading-tight ${onClick ? 'text-blue-600 underline decoration-dotted group-hover:text-blue-800' : 'text-gray-600'}`}>{label}</p>
      {trend !== null && trend !== undefined && (
        <p className={`text-[11px] font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
          {trend >= 0 ? '+' : ''}{fmt(trend, 2)}%
        </p>
      )}
    </div>
  );
}

// ─── P. Items Sold By Name ────────────────────────────────────────
function ItemsSoldByName({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };
  const [detailModal, setDetailModal] = useState(null); // null | 'qty' | 'revenue'

  const diffDays = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  const prevEnd   = new Date(new Date(start) - 86400000).toISOString().split('T')[0];
  const prevStart = new Date(new Date(start) - diffDays * 86400000).toISOString().split('T')[0];

  const { data, isLoading } = useQuery(
    ['rpt-items-name', start, end],
    () => api.get('/reports/menu-performance', { params: { start_date: start, end_date: end, limit: 50 } }).then(r => r.data)
  );
  const { data: prevData } = useQuery(
    ['rpt-items-name-prev', prevStart, prevEnd],
    () => api.get('/reports/menu-performance', { params: { start_date: prevStart, end_date: prevEnd, limit: 50 } }).then(r => r.data)
  );

  const items     = data?.item_performance     || [];
  const prevItems = prevData?.item_performance || [];

  const totalQty  = items.reduce((s, i) => s + parseInt(i.total_quantity || 0), 0);
  const totalRev  = items.reduce((s, i) => s + parseFloat(i.total_revenue || 0), 0);
  const avgPrice  = items.length ? items.reduce((s, i) => s + parseFloat(i.avg_unit_price || 0), 0) / items.length : 0;

  const prevQty  = prevItems.reduce((s, i) => s + parseInt(i.total_quantity || 0), 0);
  const prevRev  = prevItems.reduce((s, i) => s + parseFloat(i.total_revenue || 0), 0);
  const prevAvg  = prevItems.length ? prevItems.reduce((s, i) => s + parseFloat(i.avg_unit_price || 0), 0) / prevItems.length : 0;

  const trendQty = prevQty  > 0 ? ((totalQty - prevQty) / prevQty) * 100  : null;
  const trendRev = prevRev  > 0 ? ((totalRev - prevRev) / prevRev) * 100  : null;
  const trendAvg = prevAvg  > 0 ? ((avgPrice - prevAvg) / prevAvg) * 100  : null;

  const top15 = [...items].sort((a, b) => parseInt(b.total_quantity) - parseInt(a.total_quantity)).slice(0, 15);

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now() - 86400000).toISOString().split('T')[0]; ud(y, y); }}
        onLast7={() => ud(new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(items, `items-sold-by-name-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Items Sold By Name')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Items Sold By Name</h2>
          <span className="sub text-xs text-gray-500 mb-4 block">{start} — {end}</span>

          {/* Donut summary row */}
          <div className="flex items-start justify-around bg-white border border-gray-100 rounded-2xl shadow-sm py-5 px-4 mb-5 no-print">
            <DonutStat label="Total Qty Sold" value={totalQty} trend={trendQty} color="#f97316" onClick={() => setDetailModal('qty')} />
            <div className="w-px bg-gray-100 self-stretch" />
            <DonutStat label="Net Sales" value={`৳${fmt(totalRev, 0)}`} trend={trendRev} color="#22c55e" onClick={() => setDetailModal('revenue')} />
            <div className="w-px bg-gray-100 self-stretch" />
            <DonutStat label="Avg Item Price" value={`৳${fmt(avgPrice, 0)}`} trend={trendAvg} color="#3b82f6" />
          </div>

          {/* Detail modal */}
          {detailModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      {detailModal === 'qty' ? 'Total Qty Sold — Item Breakdown' : 'Net Sales — Item Breakdown'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{start} — {end}</p>
                  </div>
                  <button onClick={() => setDetailModal(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                </div>
                <div className="overflow-y-auto flex-1 px-4 py-3">
                  {[...items]
                    .sort((a, b) =>
                      detailModal === 'qty'
                        ? parseInt(b.total_quantity || 0) - parseInt(a.total_quantity || 0)
                        : parseFloat(b.total_revenue || 0) - parseFloat(a.total_revenue || 0)
                    )
                    .map((item, i) => {
                      const maxVal = detailModal === 'qty' ? totalQty : totalRev;
                      const val = detailModal === 'qty' ? parseInt(item.total_quantity || 0) : parseFloat(item.total_revenue || 0);
                      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                      return (
                        <div key={item.id || i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-gray-800 truncate">{item.item_name}</span>
                              <span className="text-sm font-black text-gray-900 ml-2 shrink-0">
                                {detailModal === 'qty' ? val : `৳${fmt(val)}`}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: detailModal === 'qty' ? '#f97316' : '#22c55e' }} />
                            </div>
                            <span className="text-[10px] text-gray-400">{item.category_name} · {pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
                <div className="px-5 py-3 border-t bg-gray-50 rounded-b-2xl flex justify-between text-xs text-gray-500">
                  <span>{items.length} items</span>
                  <span className="font-bold text-gray-800">
                    Total: {detailModal === 'qty' ? totalQty : `৳${fmt(totalRev)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bar chart */}
          {top15.length > 0 && (
            <div className="mb-5 no-print bg-white border border-gray-100 rounded-2xl shadow-sm p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top15.map(i => ({ name: i.item_name.length > 14 ? i.item_name.slice(0, 14) + '…' : i.item_name, qty: parseInt(i.total_quantity || 0) }))}
                  margin={{ top: 4, right: 12, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} formatter={v => [v, 'Qty']} />
                  <Bar dataKey="qty" fill="#22c55e" radius={[4, 4, 0, 0]} name="Qty Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {items.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>#</Th><Th>Item Name</Th><Th>Category</Th><Th right>Qty Sold</Th><Th right>Orders</Th><Th right>Revenue</Th><Th right>Avg Price</Th></tr></thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id || i} className={T.rowHover}>
                      <Td mono>{i + 1}</Td>
                      <Td><span className="font-semibold text-gray-900">{item.item_name}</span></Td>
                      <Td><span className={`${T.badge} bg-gray-100 text-gray-700`}>{item.category_name}</span></Td>
                      <Td right bold>{parseInt(item.total_quantity || 0)}</Td>
                      <Td right>{item.orders_count}</Td>
                      <Td right bold>৳{fmt(item.total_revenue)}</Td>
                      <Td right>৳{fmt(item.avg_unit_price)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td colSpan={3} className="px-3 py-2 text-sm font-bold">TOTAL ({items.length} items)</td>
                    <td className="px-3 py-2 text-sm font-black text-right">{totalQty}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{items.reduce((s, i) => s + parseInt(i.orders_count || 0), 0)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(totalRev)}</td>
                    <td />
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Q. Items Sold By Category ────────────────────────────────────
function ItemsSoldByCategory({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

  const diffDays = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
  const prevEnd   = new Date(new Date(start) - 86400000).toISOString().split('T')[0];
  const prevStart = new Date(new Date(start) - diffDays * 86400000).toISOString().split('T')[0];

  const { data, isLoading } = useQuery(
    ['rpt-items-cat', start, end],
    () => api.get('/reports/menu-performance', { params: { start_date: start, end_date: end } }).then(r => r.data)
  );
  const { data: prevData } = useQuery(
    ['rpt-items-cat-prev', prevStart, prevEnd],
    () => api.get('/reports/menu-performance', { params: { start_date: prevStart, end_date: prevEnd } }).then(r => r.data)
  );

  const cats     = data?.category_performance     || [];
  const prevCats = prevData?.category_performance || [];

  const totalQty = cats.reduce((s, c) => s + parseInt(c.total_quantity || 0), 0);
  const totalRev = cats.reduce((s, c) => s + parseFloat(c.total_revenue || 0), 0);
  const uniqueCats = cats.length;

  const prevQty  = prevCats.reduce((s, c) => s + parseInt(c.total_quantity || 0), 0);
  const prevRev  = prevCats.reduce((s, c) => s + parseFloat(c.total_revenue || 0), 0);
  const prevCatCount = prevCats.length;

  const trendQty  = prevQty      > 0 ? ((totalQty - prevQty) / prevQty) * 100             : null;
  const trendRev  = prevRev      > 0 ? ((totalRev - prevRev) / prevRev) * 100             : null;
  const trendCats = prevCatCount > 0 ? ((uniqueCats - prevCatCount) / prevCatCount) * 100 : null;

  return (
    <div>
      <DateBar start={start} end={end} setStart={setStart} setEnd={setEnd}
        onToday={() => ud(today, today)}
        onYesterday={() => { const y = new Date(Date.now() - 86400000).toISOString().split('T')[0]; ud(y, y); }}
        onLast7={() => ud(new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], today)}
        onThisMonth={() => { const m = new Date(); m.setDate(1); ud(m.toISOString().split('T')[0], today); }}>
        <button onClick={() => exportCSV(cats, `items-sold-by-category-${start}-${end}`)} className={T.btnGhost}>⬇ CSV</button>
        <button onClick={() => printSection(ref, 'Items Sold By Category')} className={T.btnPrimary}>🖨 Print</button>
      </DateBar>
      {isLoading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
        <div ref={ref}>
          <h2 className="text-base font-bold text-gray-900 mb-1">Items Sold By Category</h2>
          <span className="sub text-xs text-gray-500 mb-4 block">{start} — {end}</span>

          {/* Donut summary row */}
          <div className="flex items-start justify-around bg-white border border-gray-100 rounded-2xl shadow-sm py-5 px-4 mb-5 no-print">
            <DonutStat label="Total Qty Sold" value={totalQty} trend={trendQty} color="#f97316" />
            <div className="w-px bg-gray-100 self-stretch" />
            <DonutStat label="Net Sales" value={`৳${fmt(totalRev, 0)}`} trend={trendRev} color="#22c55e" />
            <div className="w-px bg-gray-100 self-stretch" />
            <DonutStat label="Categories" value={uniqueCats} trend={trendCats} color="#3b82f6" />
          </div>

          {/* Bar chart */}
          {cats.length > 0 && (
            <div className="mb-5 no-print bg-white border border-gray-100 rounded-2xl shadow-sm p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cats.map(c => ({ name: c.category_name, qty: parseInt(c.total_quantity || 0) }))}
                  margin={{ top: 4, right: 12, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} formatter={v => [v, 'Qty']} />
                  <Bar dataKey="qty" fill="#22c55e" radius={[4, 4, 0, 0]} name="Qty Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {cats.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Category</Th><Th right>Qty Sold</Th><Th right>Unique Items</Th><Th right>Orders</Th><Th right>Revenue</Th></tr></thead>
                <tbody>
                  {cats.map((c, i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-semibold text-gray-900">{c.category_name}</span></Td>
                      <Td right bold>{parseInt(c.total_quantity || 0)}</Td>
                      <Td right>{c.unique_items_sold}</Td>
                      <Td right>{c.orders_count}</Td>
                      <Td right bold>৳{fmt(c.total_revenue)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <SumRow>
                    <td className="px-3 py-2 text-sm font-bold">TOTAL ({cats.length} categories)</td>
                    <td className="px-3 py-2 text-sm font-black text-right">{totalQty}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{cats.reduce((s, c) => s + parseInt(c.unique_items_sold || 0), 0)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">{cats.reduce((s, c) => s + parseInt(c.orders_count || 0), 0)}</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(totalRev)}</td>
                  </SumRow>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Report Registry ─────────────────────────────────────────────
// ─── Branch P&L Report ───────────────────────────────────────────
function BranchPLReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const { data: branchesData } = useQuery('branches-pl-rpt', () => api.get('/branches').then(r => r.data));
  const [branchId, setBranchId] = useState('');
  const branches = (branchesData?.branches || []).filter(b => b.is_active);
  const EXPENSE_CATS = ['rent','utilities','salaries','supplies','maintenance','marketing','other'];

  const { data, isLoading } = useQuery(
    ['branch-pl-rpt', branchId, dateFrom, dateTo],
    () => api.get('/branches/pl-report', { params: { branch_id: branchId || undefined, date_from: dateFrom, date_to: dateTo } }).then(r => r.data),
    { refetchInterval: 60000 }
  );
  const rows = data?.pl || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">Branch</label>
          <select value={branchId} onChange={e=>setBranchId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Branches</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">From</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">To</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      {isLoading ? <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" /></div> :
        rows.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm">No data for selected period</div> :
        <div className="space-y-4">
          {rows.map(b => (
            <div key={b.branch_id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black text-xs">{b.branch_code}</div>
                  <span className="font-bold text-gray-800">{b.branch_name}</span>
                  <span className="text-xs text-gray-400">{b.period.from} → {b.period.to}</span>
                </div>
                <div className={`font-black text-base ${b.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {b.gross_profit >= 0 ? '▲ ' : '▼ '}৳{Math.abs(b.gross_profit).toLocaleString(undefined,{maximumFractionDigits:0})}
                  <span className="ml-1 text-xs font-semibold opacity-70">{b.profit_margin}% margin</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-x divide-gray-50">
                <div className="p-4 space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Revenue</p>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Orders ({b.order_count})</span><span className="font-bold text-gray-800">৳{b.revenue.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Discounts</span><span className="text-red-400">-৳{b.total_discount.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>VAT collected</span><span>৳{b.total_vat.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
                </div>
                <div className="p-4 space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Expenses</p>
                  {EXPENSE_CATS.map(cat => b.expenses_by_category[cat] > 0 && (
                    <div key={cat} className="flex justify-between text-xs">
                      <span className="capitalize text-gray-500">{cat}</span>
                      <span className="text-gray-700">৳{b.expenses_by_category[cat].toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                    </div>
                  ))}
                  {b.total_expenses === 0 && <div className="text-xs text-gray-400">No expenses recorded</div>}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-1 font-bold text-gray-700 mt-1">
                    <span>Total</span><span className="text-red-500">৳{b.total_expenses.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Net Result</p>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Revenue</span><span className="font-bold text-sky-600">৳{b.revenue.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Expenses</span><span className="font-bold text-red-500">৳{b.total_expenses.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
                  <div className={`flex justify-between text-base font-black border-t border-gray-100 pt-2 mt-1 ${b.gross_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span>Net Profit</span>
                    <span>{b.gross_profit >= 0 ? '+' : ''}৳{b.gross_profit.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
                  </div>
                  <div className="text-xs text-gray-400 text-right">Margin: {b.profit_margin}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ─── Branch Summary ──────────────────────────────────────────────
function BranchSummaryReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const { data: branchesData } = useQuery('branches-list-rpt', () => api.get('/branches').then(r => r.data));
  const [branchId, setBranchId] = useState('');
  const { data, isLoading } = useQuery(
    ['branch-summary-rpt', branchId, start, end],
    () => api.get('/reports/branch-summary', { params: { branch_id: branchId || undefined, date_from: start, date_to: end } }).then(r => r.data),
    { refetchInterval: 60000 }
  );
  const branches = (branchesData?.branches || []).filter(b => b.is_active);
  const rows = data?.summary || [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">From</label><input type="date" value={start} onChange={e => setStart(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">To</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      {isLoading ? <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" /></div> : (
        <div className="space-y-4">
          {rows.map(b => (
            <div key={b.branch_id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black text-xs">{b.branch_code}</div>
                <h3 className="font-bold text-gray-800">{b.branch_name}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {[['Total Orders', b.total_orders],['Revenue', `৳${parseFloat(b.total_revenue).toLocaleString(undefined,{maximumFractionDigits:0})}`],['Avg Order', `৳${parseFloat(b.avg_order_value).toFixed(0)}`],['Cancelled', b.cancelled_orders]].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-3 text-center"><div className="text-sm text-gray-400">{l}</div><div className="font-black text-gray-800 text-lg">{v}</div></div>
                ))}
              </div>
              {b.top_items.length > 0 && (
                <div><div className="text-xs font-bold text-gray-400 uppercase mb-1">Top Items</div>
                  <div className="flex flex-wrap gap-2">{b.top_items.map(item => (
                    <span key={item.item_name} className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full">{item.item_name} ×{item.qty}</span>
                  ))}</div>
                </div>
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No data for selected period</div>}
        </div>
      )}
    </div>
  );
}

// ─── Branch Comparison ───────────────────────────────────────────
function BranchComparisonReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const { data, isLoading } = useQuery(
    ['branch-comparison-rpt', start, end],
    () => api.get('/reports/branch-comparison', { params: { date_from: start, date_to: end } }).then(r => r.data),
    { refetchInterval: 60000 }
  );
  const rows = data?.comparison || [];
  const maxRevenue = Math.max(...rows.map(r => r.revenue), 1);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">From</label><input type="date" value={start} onChange={e => setStart(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="text-xs font-semibold text-gray-500 block mb-1">To</label><input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
      </div>
      {isLoading ? <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full" /></div> : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Branch','Orders','Revenue','Avg Check','Today Orders','Today Revenue','Revenue Share'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3 font-bold text-gray-800">{r.name} <span className="text-xs text-gray-400">({r.code})</span></td>
                  <td className="px-4 py-3 text-gray-700">{r.orders}</td>
                  <td className="px-4 py-3 font-bold text-sky-600">৳{r.revenue.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                  <td className="px-4 py-3 text-gray-700">৳{r.avg_check.toFixed(0)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.today_orders}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">৳{r.today_revenue.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{((r.revenue / maxRevenue) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No data for selected period</div>}
        </div>
      )}
    </div>
  );
}

const REPORT_GROUPS = [
  { label:'Sales', items:[{ id:'sales-summary', label:'Daily Sales Summary' },{ id:'cancel-report', label:'Cancel Report' },{ id:'hold-report', label:'Hold / Due Report' }] },
  { label:'Financial', items:[{ id:'payment-methods', label:'Payment Methods' },{ id:'vat-report', label:'VAT Report' },{ id:'collection-summary', label:'Collection Report' },{ id:'payment-collection', label:'Payment Collection' },{ id:'discount-report', label:'Discount Report' },{ id:'due-collection', label:'Due Collection' }] },
  { label:'Operations', items:[{ id:'category-sales', label:'Category Sales' },{ id:'items-by-name', label:'Items Sold By Name' },{ id:'items-by-category', label:'Items Sold By Category' },{ id:'delivery-report', label:'Home Delivery' },{ id:'reservation-report', label:'Reservations' }] },
  { label:'Analytics', items:[{ id:'user-summary', label:'User Sales Summary' },{ id:'yearly-summary', label:'Yearly Summary' },{ id:'customer-search', label:'Customer Search' },{ id:'menu-list', label:'Menu List' }] },
  { label:'Branch', items:[{ id:'branch-summary', label:'Branch Summary' },{ id:'branch-comparison', label:'Branch Comparison' },{ id:'branch-pl', label:'P&L Report' }] },
];
const REPORT_COMPONENT = {
  'sales-summary':      DailySalesSummary,
  'cancel-report':      CancelReport,
  'hold-report':        HoldDueReport,
  'payment-methods':    PaymentMethodsReport,
  'vat-report':         VATReport,
  'collection-summary': CollectionSummaryReport,
  'payment-collection': PaymentCollectionReport,
  'discount-report':    DiscountReport,
  'due-collection':     DueCollectionReport,
  'category-sales':     CategorySalesReport,
  'items-by-name':      ItemsSoldByName,
  'items-by-category':  ItemsSoldByCategory,
  'delivery-report':    DeliveryReport,
  'reservation-report': ReservationReport,
  'user-summary':       UserSalesSummary,
  'yearly-summary':     YearlySummary,
  'customer-search':    CustomerSearchReport,
  'menu-list':          MenuListReport,
  'branch-summary':     BranchSummaryReport,
  'branch-comparison':  BranchComparisonReport,
  'branch-pl':          BranchPLReport,
};

// ─── Main Reports Page ───────────────────────────────────────────
export default function Reports() {
  const { api } = useAuth();
  const [active, setActive] = useState('sales-summary');
  const [activeGroup, setActiveGroup] = useState('Sales');
  const ActiveReport = REPORT_COMPONENT[active];

  const currentGroup = REPORT_GROUPS.find(g => g.label === activeGroup) || REPORT_GROUPS[0];

  const handleGroupChange = (group) => {
    setActiveGroup(group.label);
    setActive(group.items[0].id);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter,system-ui,sans-serif' }}>
      {/* ── Top Group Bar ── */}
      <div className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <h1 className="text-base font-black text-gray-900">Reports</h1>
            <span className="text-xs text-gray-400">{REPORT_GROUPS.reduce((s, g) => s + g.items.length, 0)} report types</span>
          </div>
          {/* Group tabs */}
          <div className="flex gap-1 pt-2">
            {REPORT_GROUPS.map(group => (
              <button key={group.label} onClick={() => handleGroupChange(group)}
                className={`px-4 py-2 text-sm font-semibold transition-colors rounded-t-lg -mb-px border-b-2 ${
                  activeGroup === group.label
                    ? 'border-red-600 text-red-700 bg-red-50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sub-report Pills ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-6 py-2.5 flex flex-wrap gap-1.5">
          {currentGroup.items.map(item => (
            <button key={item.id} onClick={() => setActive(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                active === item.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Report Content ── */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {ActiveReport && <ActiveReport api={api} />}
      </main>
    </div>
  );
}
