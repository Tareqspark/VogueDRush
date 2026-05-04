import React, { useState } from 'react';
import { PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const TABS = ['Floor Map', 'Bookings', 'Deposits', 'Waitlist', 'Analytics'];

// Floor plan: rows × columns of "zones"
const FLOOR_TABLES = [
  { id: 1, label: 'T-01', shape: 'round',  capacity: 2, x: 0, y: 0, status: 'available' },
  { id: 2, label: 'T-02', shape: 'round',  capacity: 2, x: 1, y: 0, status: 'occupied'  },
  { id: 3, label: 'T-03', shape: 'square', capacity: 4, x: 2, y: 0, status: 'reserved'  },
  { id: 4, label: 'T-04', shape: 'square', capacity: 4, x: 3, y: 0, status: 'occupied'  },
  { id: 5, label: 'T-05', shape: 'round',  capacity: 2, x: 0, y: 1, status: 'available' },
  { id: 6, label: 'T-06', shape: 'rect',   capacity: 6, x: 1, y: 1, status: 'occupied'  },
  { id: 7, label: 'T-07', shape: 'rect',   capacity: 6, x: 3, y: 1, status: 'reserved'  },
  { id: 8, label: 'T-08', shape: 'round',  capacity: 2, x: 0, y: 2, status: 'available' },
  { id: 9, label: 'T-09', shape: 'square', capacity: 4, x: 2, y: 2, status: 'occupied'  },
  { id:10, label: 'T-10', shape: 'square', capacity: 4, x: 3, y: 2, status: 'available' },
  { id:11, label: 'T-11', shape: 'rect',   capacity: 8, x: 1, y: 3, status: 'reserved'  },
  { id:12, label: 'T-12', shape: 'rect',   capacity: 10,x: 2, y: 3, status: 'occupied'  },
];

const BOOKINGS = [
  { id: 1, ref: 'RES-2026-0182', name: 'Ahmed Al Rashid', pax: 4, date: '2026-05-05', time: '19:30', table: 'T-03', deposit: 'paid',    status: 'confirmed', source: 'App' },
  { id: 2, ref: 'RES-2026-0181', name: 'Sara Johnson',    pax: 2, date: '2026-05-05', time: '20:00', table: 'T-02', deposit: 'waived',  status: 'confirmed', source: 'Phone' },
  { id: 3, ref: 'RES-2026-0180', name: 'Mohamed Hassan',  pax: 6, date: '2026-05-05', time: '20:30', table: 'T-07', deposit: 'paid',    status: 'seated',    source: 'Website' },
  { id: 4, ref: 'RES-2026-0179', name: 'Priya Sharma',    pax: 2, date: '2026-05-05', time: '21:00', table: 'T-05', deposit: 'pending', status: 'confirmed', source: 'App' },
  { id: 5, ref: 'RES-2026-0178', name: 'Carlos Mendez',   pax: 4, date: '2026-05-04', time: '19:00', table: 'T-04', deposit: 'paid',    status: 'no_show',   source: 'App' },
  { id: 6, ref: 'RES-2026-0177', name: 'Fatima Al Zaabi', pax: 8, date: '2026-05-06', time: '20:00', table: 'T-11', deposit: 'paid',    status: 'confirmed', source: 'Email' },
];

const DEPOSITS = [
  { id: 1, ref: 'RES-2026-0182', customer: 'Ahmed Al Rashid', amount: 100.00, method: 'Credit Card', date: '2026-05-03', status: 'paid',    refundable: true },
  { id: 2, ref: 'RES-2026-0180', customer: 'Mohamed Hassan',  amount: 150.00, method: 'Apple Pay',   date: '2026-05-02', status: 'applied', refundable: false },
  { id: 3, ref: 'RES-2026-0179', customer: 'Priya Sharma',    amount: 50.00,  method: 'Bank Transfer',date: '2026-05-04',status: 'pending', refundable: true },
  { id: 4, ref: 'RES-2026-0177', customer: 'Fatima Al Zaabi', amount: 200.00, method: 'Credit Card', date: '2026-05-04', status: 'paid',    refundable: true },
  { id: 5, ref: 'RES-2026-0178', customer: 'Carlos Mendez',   amount: 100.00, method: 'Credit Card', date: '2026-04-30', status: 'forfeited',refundable: false },
];

const WAITLIST = [
  { id: 1, name: 'John Smith',     pax: 4, addedAt: '20:05', estimatedWait: '15 min', phone: '+971-50-1234567', status: 'waiting' },
  { id: 2, name: 'Layla Ahmed',    pax: 2, addedAt: '20:18', estimatedWait: '8 min',  phone: '+971-55-2345678', status: 'waiting' },
  { id: 3, name: 'Chris Martin',   pax: 6, addedAt: '20:22', estimatedWait: '25 min', phone: '+971-50-3456789', status: 'notified' },
];

const TABLE_STATUS_STYLE = {
  available: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  occupied:  'bg-rose-100 border-rose-300 text-rose-800',
  reserved:  'bg-amber-100 border-amber-300 text-amber-800',
};

const BOOKING_STYLE = {
  confirmed: 'bg-sky-50 text-sky-700',
  seated:    'bg-emerald-50 text-emerald-700',
  no_show:   'bg-rose-50 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function AdvancedReservations() {
  const [tab, setTab] = useState('Floor Map');

  const todayBookings = BOOKINGS.filter(b => b.date === '2026-05-05').length;
  const noShowCount   = BOOKINGS.filter(b => b.status === 'no_show').length;
  const depositTotal  = DEPOSITS.filter(d => d.status !== 'pending').reduce((s, d) => s + d.amount, 0);
  const waitlistCount = WAITLIST.length;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Advanced Reservations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module J · Floor Planning · Booking Engine · Deposits · Waitlist · Yield Management</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> New Booking</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Bookings",    val: todayBookings,                         sub: `${BOOKINGS.filter(b=>b.status==='seated').length} seated now`,  color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'No-Show Rate',        val: `${Math.round((noShowCount/BOOKINGS.length)*100)}%`, sub: `${noShowCount} no-shows this week`, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
          { label: 'Deposits Collected',  val: `AED ${depositTotal.toLocaleString()}`,sub: 'Paid + applied',        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Waitlist',            val: waitlistCount,                         sub: 'Guests waiting now',    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
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
              {t === 'Waitlist' && waitlistCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-xs font-black">{waitlistCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Floor Map' && (
            <div>
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {[
                  { status: 'available', color: 'bg-emerald-100 border-emerald-300', count: FLOOR_TABLES.filter(t=>t.status==='available').length },
                  { status: 'occupied',  color: 'bg-rose-100 border-rose-300',      count: FLOOR_TABLES.filter(t=>t.status==='occupied').length  },
                  { status: 'reserved',  color: 'bg-amber-100 border-amber-300',    count: FLOOR_TABLES.filter(t=>t.status==='reserved').length  },
                ].map(l => (
                  <div key={l.status} className="flex items-center gap-1.5">
                    <div className={`h-4 w-4 rounded border ${l.color}`} />
                    <span className="text-xs text-slate-500 capitalize">{l.status} ({l.count})</span>
                  </div>
                ))}
              </div>
              {/* Floor grid */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 overflow-x-auto">
                <div className="inline-grid gap-3" style={{ gridTemplateColumns: 'repeat(4, minmax(80px, 1fr))', minWidth: '360px' }}>
                  {FLOOR_TABLES.map(t => (
                    <div key={t.id} className={`border-2 rounded-xl p-2.5 cursor-pointer hover:opacity-80 transition-opacity ${TABLE_STATUS_STYLE[t.status]} ${t.shape === 'round' ? 'rounded-full' : ''}`}
                      style={{ gridColumn: `${t.x + 1}`, gridRow: `${t.y + 1}` }}>
                      <p className="text-xs font-black text-center">{t.label}</p>
                      <p className="text-xs text-center opacity-70">{t.capacity}p</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Click a table to view/manage reservation. Drag tables to rearrange floor plan.</p>
            </div>
          )}

          {tab === 'Bookings' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Ref</th><th>Guest Name</th><th>Pax</th><th>Date & Time</th><th>Table</th><th>Deposit</th><th>Source</th><th>Status</th></tr></thead>
                <tbody>
                  {BOOKINGS.map(b => (
                    <tr key={b.id}>
                      <td><code className="text-xs text-sky-700 font-mono font-bold">{b.ref}</code></td>
                      <td className="font-semibold text-slate-800">{b.name}</td>
                      <td className="text-center font-bold text-slate-700">{b.pax}</td>
                      <td className="text-xs text-slate-500">{b.date} · {b.time}</td>
                      <td><span className="text-sm font-bold text-slate-700">{b.table}</span></td>
                      <td><span className={`status-badge ${b.deposit === 'paid' ? 'bg-emerald-50 text-emerald-700' : b.deposit === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{b.deposit}</span></td>
                      <td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{b.source}</span></td>
                      <td><span className={`status-badge ${BOOKING_STYLE[b.status]}`}>{b.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Deposits' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Booking Ref</th><th>Customer</th><th>Amount</th><th>Method</th><th>Date</th><th>Refundable</th><th>Status</th></tr></thead>
                <tbody>
                  {DEPOSITS.map(d => (
                    <tr key={d.id}>
                      <td><code className="text-xs text-sky-700 font-mono">{d.ref}</code></td>
                      <td className="font-semibold text-slate-800">{d.customer}</td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {d.amount.toFixed(2)}</td>
                      <td className="text-xs text-slate-500">{d.method}</td>
                      <td className="text-xs text-slate-500">{d.date}</td>
                      <td>{d.refundable ? <span className="text-xs text-emerald-600 font-semibold">Yes</span> : <span className="text-xs text-rose-500 font-semibold">No</span>}</td>
                      <td><span className={`status-badge ${d.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : d.status === 'applied' ? 'bg-sky-50 text-sky-700' : d.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Waitlist' && (
            <div className="space-y-3">
              {WAITLIST.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDaysIcon className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Waitlist is empty!</p>
                </div>
              ) : WAITLIST.map((w, i) => (
                <div key={w.id} className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-sm font-black shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{w.name} · {w.pax} pax</p>
                    <p className="text-xs text-slate-500">Added at {w.addedAt} · Est. wait {w.estimatedWait} · {w.phone}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {w.status === 'notified' && <span className="status-badge bg-sky-50 text-sky-700">Notified</span>}
                    <button className="btn btn-primary btn-sm text-xs">Seat Now</button>
                    <button className="btn btn-ghost btn-sm text-xs text-rose-500">Remove</button>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm mt-2"><PlusIcon className="h-4 w-4" /> Add to Waitlist</button>
            </div>
          )}

          {tab === 'Analytics' && (
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { label: 'Avg Covers / Day',    val: '42',    sub: 'May 2026' },
                { label: 'Table Turnover Rate', val: '2.4×',  sub: 'Avg turns / table / day' },
                { label: 'RevPASH',             val: 'AED 38',sub: 'Revenue per available seat/hour' },
                { label: 'No-Show Rate',        val: '16.7%', sub: 'Industry avg: 12%' },
                { label: 'Online Booking Share',val: '71%',   sub: 'App + Website' },
                { label: 'Avg Booking Lead Time',val: '3.2 days',sub: 'Time from booking to visit' },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <p className="text-xl font-black text-slate-800">{s.val}</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{s.label}</p>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
