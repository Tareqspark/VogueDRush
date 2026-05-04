import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QrCodeIcon, PlusIcon } from '@heroicons/react/24/outline';

const TABS = ['QR Codes', 'Active Sessions', 'Cart & Payment', 'Status & Feedback', 'Analytics'];

const PATH_MAP = {
  '':         'QR Codes',
  'setup':    'QR Codes',
  'codes':    'QR Codes',
  'sessions': 'Active Sessions',
  'menu':     'Active Sessions',
  'cart':     'Cart & Payment',
  'payment':  'Cart & Payment',
  'status':   'Status & Feedback',
  'feedback': 'Status & Feedback',
  'analytics':'Analytics',
};
const TAB_PATH = {
  'QR Codes':           '',
  'Active Sessions':    'sessions',
  'Cart & Payment':     'cart',
  'Status & Feedback':  'status',
  'Analytics':          'analytics',
};

const TABLES = [
  { id: 1, label: 'T-01', zone: 'Indoor', capacity: 4,  qrStatus: 'active',    session: { orderId: 'ORD-1258', cart: 2, total: 285.00,  mins: 24 } },
  { id: 2, label: 'T-02', zone: 'Indoor', capacity: 2,  qrStatus: 'active',    session: { orderId: 'ORD-1257', cart: 1, total: 125.00,  mins: 41 } },
  { id: 3, label: 'T-03', zone: 'Indoor', capacity: 6,  qrStatus: 'idle',      session: null },
  { id: 4, label: 'T-04', zone: 'Indoor', capacity: 4,  qrStatus: 'active',    session: { orderId: 'ORD-1256', cart: 3, total: 540.00,  mins: 11 } },
  { id: 5, label: 'T-05', zone: 'Indoor', capacity: 2,  qrStatus: 'idle',      session: null },
  { id: 6, label: 'T-06', zone: 'Indoor', capacity: 4,  qrStatus: 'active',    session: { orderId: 'ORD-1255', cart: 4, total: 720.00,  mins: 58 } },
  { id: 7, label: 'T-07', zone: 'Terrace',capacity: 4,  qrStatus: 'active',    session: { orderId: 'ORD-1254', cart: 2, total: 410.00,  mins: 6  } },
  { id: 8, label: 'T-08', zone: 'Terrace',capacity: 6,  qrStatus: 'idle',      session: null },
  { id: 9, label: 'T-09', zone: 'Terrace',capacity: 4,  qrStatus: 'active',    session: { orderId: 'ORD-1253', cart: 1, total: 195.00,  mins: 33 } },
  { id:10, label: 'T-10', zone: 'Private', capacity: 10, qrStatus: 'idle',      session: null },
  { id:11, label: 'T-11', zone: 'Private', capacity: 8,  qrStatus: 'active',    session: { orderId: 'ORD-1252', cart: 6, total: 1280.00, mins: 72 } },
  { id:12, label: 'T-12', zone: 'Bar',     capacity: 2,  qrStatus: 'disabled',  session: null },
];

const SESSIONS = TABLES.filter(t => t.session !== null);

const ANALYTICS_DAILY = [
  { day: 'Mon', sessions: 38, orders: 52, revenue: 14200 },
  { day: 'Tue', sessions: 31, orders: 44, revenue: 11800 },
  { day: 'Wed', sessions: 42, orders: 58, revenue: 16400 },
  { day: 'Thu', sessions: 45, orders: 63, revenue: 18100 },
  { day: 'Fri', sessions: 62, orders: 88, revenue: 24800 },
  { day: 'Sat', sessions: 71, orders: 98, revenue: 28200 },
  { day: 'Sun', sessions: 55, orders: 75, revenue: 21500 },
];

const maxRevenue = Math.max(...ANALYTICS_DAILY.map(d => d.revenue));

function QRPattern() {
  return (
    <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: 'repeat(7, 6px)' }}>
      {Array.from({ length: 49 }, (_, i) => {
        const corner = (i < 15 && i % 7 < 3) || (i < 15 && i % 7 > 3) || (i >= 35 && i % 7 < 3);
        return (
          <div key={i} className={`w-1.5 h-1.5 rounded-sm ${corner || Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white'}`} />
        );
      })}
    </div>
  );
}

export default function QROrdering() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath  = location.pathname.replace(/^\/qr-ordering\/?/, '');
  const tab      = PATH_MAP[subPath] || 'QR Codes';
  const setTab   = (t) => navigate(TAB_PATH[t] ? `/qr-ordering/${TAB_PATH[t]}` : '/qr-ordering');

  const activeSessions = SESSIONS.length;
  const todayOrders    = 88;
  const avgCart        = (SESSIONS.reduce((s, t) => s + t.session.total, 0) / SESSIONS.length).toFixed(0);
  const adoptionRate   = Math.round((activeSessions / TABLES.filter(t => t.qrStatus !== 'disabled').length) * 100);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">QR Ordering System</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module H · QR Codes · Self-Ordering · Live Sessions · Upsell Automation · Analytics</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Generate QR Code</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Sessions',  val: activeSessions,           sub: 'Tables ordering now',     color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: "Today's QR Orders",val: todayOrders,              sub: 'Fri 2 May 2026',          color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Avg Cart Value',   val: `AED ${avgCart}`,         sub: 'Active sessions only',    color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
          { label: 'QR Adoption Rate', val: `${adoptionRate}%`,       sub: 'Tables using self-order', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
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
          {tab === 'QR Codes' && (
            <div>
              <p className="text-xs text-slate-500 mb-4">Each table has a unique QR code. Scan to open digital menu & place orders directly.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {TABLES.map(t => (
                  <div key={t.id} className={`rounded-xl border p-4 flex flex-col items-center gap-2 ${t.qrStatus === 'active' ? 'border-emerald-200 bg-emerald-50/40' : t.qrStatus === 'disabled' ? 'border-slate-200 bg-slate-50 opacity-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-black text-slate-800">{t.label}</span>
                      <span className={`status-badge text-xs ${t.qrStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : t.qrStatus === 'disabled' ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-600'}`}>{t.qrStatus}</span>
                    </div>
                    <div className={`p-2 rounded-lg border ${t.qrStatus === 'disabled' ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'}`}>
                      <QrCodeIcon className={`h-12 w-12 ${t.qrStatus === 'disabled' ? 'text-slate-200' : 'text-slate-800'}`} />
                    </div>
                    <div className="w-full space-y-0.5 text-center">
                      <p className="text-xs text-slate-400">{t.zone} · {t.capacity} pax</p>
                      {t.session && (
                        <p className="text-xs font-bold text-emerald-700">AED {t.session.total.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Active Sessions' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Table</th><th>Zone</th><th>Order ID</th><th>Cart Items</th><th>Cart Total</th><th>Session Time</th><th>Action</th></tr></thead>
                <tbody>
                  {SESSIONS.map(t => (
                    <tr key={t.id}>
                      <td className="font-black text-slate-800">{t.label}</td>
                      <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.zone}</span></td>
                      <td><code className="text-xs text-sky-700 font-mono font-bold">{t.session.orderId}</code></td>
                      <td className="text-center font-bold text-slate-700">{t.session.cart} items</td>
                      <td className="font-mono text-xs font-bold text-emerald-700">AED {t.session.total.toLocaleString()}</td>
                      <td>
                        <span className={`text-xs font-bold ${t.session.mins > 60 ? 'text-rose-600' : t.session.mins > 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {t.session.mins} min
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-sm text-xs">View</button>
                          <button className="btn btn-ghost btn-sm text-xs text-rose-500">End</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Analytics' && (
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily QR Revenue — This Week</p>
              <div className="flex items-end gap-2 h-32">
                {ANALYTICS_DAILY.map(d => {
                  const pct = (d.revenue / maxRevenue) * 100;
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-slate-600" style={{ fontSize: '10px' }}>{(d.revenue/1000).toFixed(0)}K</span>
                      <div className="w-full rounded-t-lg bg-sky-500 hover:bg-sky-400 transition-all" style={{ height: `${pct}%`, minHeight: '8px' }} />
                      <span className="text-xs text-slate-400">{d.day}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Avg Sessions / Day', val: Math.round(ANALYTICS_DAILY.reduce((s,d)=>s+d.sessions,0)/7), sub: 'This week' },
                  { label: 'Avg Orders / Day',   val: Math.round(ANALYTICS_DAILY.reduce((s,d)=>s+d.orders,0)/7),   sub: 'This week' },
                  { label: 'Avg Revenue / Day',  val: `AED ${Math.round(ANALYTICS_DAILY.reduce((s,d)=>s+d.revenue,0)/7).toLocaleString()}`, sub: 'This week' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-xl font-black text-slate-800">{s.val}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                    <p className="text-xs text-slate-400">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Cart & Payment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Open Carts', val: SESSIONS.length, sub: 'Awaiting checkout', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
                  { label: 'Avg Cart Value', val: `AED ${Math.round(SESSIONS.reduce((s,t)=>s+t.session.total,0)/SESSIONS.length)}`, sub: 'Active sessions', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  { label: 'Bill Requested', val: '3', sub: 'Awaiting waiter', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
                  { label: 'Payments Today', val: '62', sub: 'Card + cash', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
                ].map(k => (
                  <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
                    <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">{k.label}</p>
                    <p className="text-xs text-slate-500">{k.sub}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Table</th><th>Order</th><th>Items</th><th>Cart Total</th><th>VAT</th><th>Grand Total</th><th>Payment Method</th><th>Status</th></tr></thead>
                  <tbody>
                    {SESSIONS.map(t => (
                      <tr key={t.id}>
                        <td className="font-bold text-slate-800">{t.label}</td>
                        <td><code className="text-xs text-sky-700">{t.session.orderId}</code></td>
                        <td className="text-xs text-slate-500">{t.session.cart} items</td>
                        <td className="font-mono text-xs text-slate-700">AED {t.session.total.toFixed(2)}</td>
                        <td className="font-mono text-xs text-slate-500">AED {(t.session.total * 0.05).toFixed(2)}</td>
                        <td className="font-mono text-xs font-bold text-slate-700">AED {(t.session.total * 1.05).toFixed(2)}</td>
                        <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Card</span></td>
                        <td><span className="status-badge bg-amber-50 text-amber-700">awaiting</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Status & Feedback' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Table</th><th>Order</th><th>Stage</th><th>Food</th><th>Service</th><th>Overall</th><th>Comment</th></tr></thead>
                  <tbody>
                    {[
                      { table: 'T-03', order: 'ORD-1241', stage: 'served',    food: 5, service: 4, overall: 5, comment: 'Pizza was amazing!' },
                      { table: 'T-07', order: 'ORD-1240', stage: 'preparing', food: null, service: null, overall: null, comment: '—' },
                      { table: 'T-09', order: 'ORD-1239', stage: 'ready',     food: null, service: null, overall: null, comment: '—' },
                      { table: 'T-02', order: 'ORD-1238', stage: 'served',    food: 3, service: 4, overall: 3, comment: 'Wait time was long' },
                      { table: 'T-05', order: 'ORD-1237', stage: 'served',    food: 5, service: 5, overall: 5, comment: 'Excellent service 👏' },
                    ].map((r, i) => (
                      <tr key={i}>
                        <td className="font-bold text-slate-800">{r.table}</td>
                        <td><code className="text-xs text-sky-700">{r.order}</code></td>
                        <td><span className={`status-badge text-xs ${ r.stage === 'served' ? 'bg-emerald-50 text-emerald-700' : r.stage === 'ready' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700' }`}>{r.stage}</span></td>
                        <td className="text-xs">{r.food ? '⭐'.repeat(r.food) : '—'}</td>
                        <td className="text-xs">{r.service ? '⭐'.repeat(r.service) : '—'}</td>
                        <td className="text-xs font-bold text-slate-700">{r.overall ? `${r.overall}/5` : '—'}</td>
                        <td className="text-xs text-slate-500 max-w-[180px]">{r.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
