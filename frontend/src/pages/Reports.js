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

// ─── A. Daily Sales Summary ──────────────────────────────────────
function DailySalesSummary({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

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
            <SummaryCard label="Total Revenue"  value={`৳${fmt(t.revenue)}`}/>
            <SummaryCard label="Total Orders"   value={t.total||0} color="text-blue-600"/>
            <SummaryCard label="Total VAT"      value={`৳${fmt(t.vat)}`} color="text-amber-600"/>
            <SummaryCard label="Total Discount" value={`৳${fmt(t.discount)}`} color="text-gray-600"/>
          </div>
          {orders.length === 0 ? <EmptyState/> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><Th>Order No</Th><Th>Customer</Th><Th>Type</Th><Th>Payment</Th><Th right>Total</Th><Th right>Discount</Th><Th right>VAT</Th><Th right>Paid</Th><Th>Time</Th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className={T.rowHover}>
                      <Td mono>{o.order_number}</Td>
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
                    <td colSpan={4} className="px-3 py-2 text-sm font-bold">GRAND TOTAL ({orders.length} orders)</td>
                    <td className="px-3 py-2 text-sm font-black text-right">৳{fmt(t.revenue)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.discount)}</td>
                    <td className="px-3 py-2 text-sm font-bold text-right">৳{fmt(t.vat)}</td>
                    <td colSpan={2}/>
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

// ─── B. Cancel Report ────────────────────────────────────────────
function CancelReport({ api }) {
  const today = new Date().toISOString().split('T')[0];
  const [start, setStart] = useState(today);
  const [end, setEnd]     = useState(today);
  const ref = useRef(null);
  const ud = (s, e) => { setStart(s); setEnd(e); };

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
                      <Td mono>{o.order_number}</Td>
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
                      <Td mono>{o.order_number}</Td>
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
                        <Td mono>{o.order_number}</Td>
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
                <thead><tr><Th>Order No</Th><Th>Customer</Th><Th>Phone</Th><Th right>Order Total</Th><Th right>Advance</Th><Th right>Due</Th><Th>Status</Th><Th>Date</Th></tr></thead>
                <tbody>
                  {orders.map((o,i) => (
                    <tr key={i} className="hover:bg-orange-50">
                      <Td mono>{o.order_number}</Td>
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
                <thead><tr className="bg-gray-50"><Th>Item Name</Th><Th right>Price</Th><Th right>Promo Price</Th><Th right>VAT%</Th><Th right>Prep Time</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {menu[cat].map((item,i) => (
                    <tr key={i} className={T.rowHover}>
                      <Td><span className="font-medium text-gray-900">{item.name}</span></Td>
                      <Td right>৳{fmt(item.price)}</Td>
                      <Td right>{item.promotional_price ? <span className="text-red-600 font-bold">৳{fmt(item.promotional_price)}</span> : '—'}</Td>
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

// ─── Report Registry ─────────────────────────────────────────────
const REPORT_GROUPS = [
  { label:'Sales', items:[{ id:'sales-summary', label:'Daily Sales Summary' },{ id:'cancel-report', label:'Cancel Report' },{ id:'hold-report', label:'Hold / Due Report' }] },
  { label:'Financial', items:[{ id:'payment-methods', label:'Payment Methods' },{ id:'vat-report', label:'VAT Report' },{ id:'collection-summary', label:'Collection Report' },{ id:'payment-collection', label:'Payment Collection' },{ id:'discount-report', label:'Discount Report' },{ id:'due-collection', label:'Due Collection' }] },
  { label:'Operations', items:[{ id:'category-sales', label:'Category Sales' },{ id:'delivery-report', label:'Home Delivery' },{ id:'reservation-report', label:'Reservations' }] },
  { label:'Analytics', items:[{ id:'user-summary', label:'User Sales Summary' },{ id:'yearly-summary', label:'Yearly Summary' },{ id:'customer-search', label:'Customer Search' },{ id:'menu-list', label:'Menu List' }] },
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
  'delivery-report':    DeliveryReport,
  'reservation-report': ReservationReport,
  'user-summary':       UserSalesSummary,
  'yearly-summary':     YearlySummary,
  'customer-search':    CustomerSearchReport,
  'menu-list':          MenuListReport,
};

// ─── Main Reports Page ───────────────────────────────────────────
export default function Reports() {
  const { api } = useAuth();
  const [active, setActive] = useState('sales-summary');
  const ActiveReport = REPORT_COMPONENT[active];
  const totalReports = REPORT_GROUPS.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="flex h-full min-h-screen bg-gray-50" style={{fontFamily:'Inter,system-ui,sans-serif'}}>
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto no-print">
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <h1 className="text-base font-black text-gray-900">Reports</h1>
          <p className="text-xs text-gray-500">{totalReports} report types</p>
        </div>
        <nav className="py-2">
          {REPORT_GROUPS.map(group => (
            <div key={group.label} className="mb-1">
              <div className="px-4 pt-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.label}</div>
              {group.items.map(item => (
                <button key={item.id} onClick={() => setActive(item.id)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors rounded-none ${active===item.id ? T.tabActive : T.tabInactive}`}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-5xl mx-auto">
          {ActiveReport && <ActiveReport api={api} />}
        </div>
      </main>
    </div>
  );
}
