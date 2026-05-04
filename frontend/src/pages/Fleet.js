import React, { useState } from 'react';
import { PlusIcon, TruckIcon } from '@heroicons/react/24/outline';

const TABS = ['Riders', 'Zones', 'Assignments', 'Commissions'];

const RIDERS = [
  { id: 1, name: 'Carlos Mendez',   phone: '+971-50-5678901', zone: 'Zone A – Downtown',  vehicle: 'Motorbike', orders: 8,  rating: 4.8, status: 'on_delivery',  lat: 24.468, lng: 54.371 },
  { id: 2, name: 'Tom Bradley',     phone: '+971-50-7890123', zone: 'Zone B – Marina',     vehicle: 'Bicycle',   orders: 5,  rating: 4.5, status: 'available',    lat: 24.489, lng: 54.380 },
  { id: 3, name: 'Ahmed Khalil',    phone: '+971-55-1234567', zone: 'Zone A – Downtown',  vehicle: 'Motorbike', orders: 11, rating: 4.9, status: 'on_delivery',  lat: 24.471, lng: 54.365 },
  { id: 4, name: 'Raj Patel',       phone: '+971-50-2345678', zone: 'Zone C – Airport',   vehicle: 'Car',       orders: 3,  rating: 4.3, status: 'available',    lat: 24.440, lng: 54.651 },
  { id: 5, name: 'Omar Al Farsi',   phone: '+971-55-3456789', zone: 'Zone B – Marina',     vehicle: 'Motorbike', orders: 7,  rating: 4.7, status: 'on_delivery',  lat: 24.480, lng: 54.325 },
  { id: 6, name: 'David Kim',       phone: '+971-50-4567890', zone: 'Zone A – Downtown',  vehicle: 'Motorbike', orders: 0,  rating: 4.2, status: 'offline',      lat: 0, lng: 0 },
];

const ZONES = [
  { id: 1, name: 'Zone A – Downtown',  riders: 3, activeOrders: 4, avgTime: 18, radius: '3 km',  surcharge: 0 },
  { id: 2, name: 'Zone B – Marina',    riders: 2, activeOrders: 3, avgTime: 24, radius: '5 km',  surcharge: 5.00 },
  { id: 3, name: 'Zone C – Airport',   riders: 1, activeOrders: 1, avgTime: 32, radius: '8 km',  surcharge: 10.00 },
  { id: 4, name: 'Zone D – Suburbs',   riders: 0, activeOrders: 0, avgTime: 0,  radius: '12 km', surcharge: 15.00 },
];

const ASSIGNMENTS = [
  { id: 1, orderId: 'ORD-1258', rider: 'Carlos Mendez',  pickup: '13:45', assigned: '13:47', eta: '14:10', distance: '2.4 km', status: 'in_transit',  customer: 'Ahmed Al R.' },
  { id: 2, orderId: 'ORD-1257', rider: 'Ahmed Khalil',   pickup: '13:30', assigned: '13:32', eta: '13:58', distance: '3.1 km', status: 'in_transit',  customer: 'Sara J.' },
  { id: 3, orderId: 'ORD-1256', rider: 'Omar Al Farsi',  pickup: '13:15', assigned: '13:17', eta: '13:50', distance: '4.2 km', status: 'delivered',   customer: 'Mohamed H.' },
  { id: 4, orderId: 'ORD-1255', rider: 'Tom Bradley',    pickup: '13:00', assigned: '13:01', eta: '13:35', distance: '1.8 km', status: 'delivered',   customer: 'Priya S.' },
  { id: 5, orderId: 'ORD-1259', rider: null,             pickup: '14:00', assigned: null,    eta: null,    distance: '2.7 km', status: 'unassigned',  customer: 'Fatima A.' },
];

const COMMISSIONS = [
  { rider: 'Ahmed Khalil',  orders: 11, totalValue: 4280.00, commissionPct: 8, commission: 342.40, bonus: 50.00, total: 392.40 },
  { rider: 'Carlos Mendez', orders: 8,  totalValue: 3120.00, commissionPct: 8, commission: 249.60, bonus: 0,     total: 249.60 },
  { rider: 'Omar Al Farsi', orders: 7,  totalValue: 2740.00, commissionPct: 8, commission: 219.20, bonus: 0,     total: 219.20 },
  { rider: 'Tom Bradley',   orders: 5,  totalValue: 1950.00, commissionPct: 8, commission: 156.00, bonus: 0,     total: 156.00 },
  { rider: 'Raj Patel',     orders: 3,  totalValue: 1180.00, commissionPct: 8, commission: 94.40,  bonus: 0,     total: 94.40  },
];

const RIDER_STATUS_STYLE = {
  on_delivery: { badge: 'bg-sky-100 text-sky-700',     dot: 'bg-sky-500'     },
  available:   { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  offline:     { badge: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400'   },
};

const ASSIGN_STYLE = {
  in_transit:  'bg-sky-50 text-sky-700',
  delivered:   'bg-emerald-50 text-emerald-700',
  unassigned:  'bg-amber-50 text-amber-700',
};

export default function Fleet() {
  const [tab, setTab] = useState('Riders');

  const activeRiders   = RIDERS.filter(r => r.status === 'on_delivery' || r.status === 'available').length;
  const onDelivery     = RIDERS.filter(r => r.status === 'on_delivery').length;
  const avgTime        = Math.round(ZONES.filter(z => z.avgTime > 0).reduce((s, z) => s + z.avgTime, 0) / ZONES.filter(z => z.avgTime > 0).length);
  const totalCommission = COMMISSIONS.reduce((s, c) => s + c.total, 0);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Delivery Fleet Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Module I · Riders · Zones · Live Tracking · Assignment · Commissions · Penalties</p>
        </div>
        <button className="btn btn-primary btn-sm"><PlusIcon className="h-4 w-4" /> Add Rider</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Riders',       val: `${activeRiders}/${RIDERS.length}`,    sub: `${RIDERS.filter(r=>r.status==='offline').length} offline`, color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'On Delivery Now',     val: onDelivery,                             sub: `${ASSIGNMENTS.filter(a=>a.status==='in_transit').length} active deliveries`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Avg Delivery Time',   val: `${avgTime} min`,                       sub: 'Across active zones',    color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
          { label: 'Commission Due',      val: `AED ${totalCommission.toFixed(2)}`,    sub: 'May 2026 YTD',          color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200' },
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
          {tab === 'Riders' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {RIDERS.map(r => {
                const s = RIDER_STATUS_STYLE[r.status] || RIDER_STATUS_STYLE.offline;
                return (
                  <div key={r.id} className={`rounded-xl border p-4 ${r.status === 'on_delivery' ? 'border-sky-200 bg-sky-50/40' : r.status === 'available' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot} ${r.status !== 'offline' ? 'animate-pulse' : ''}`} />
                        <p className="text-sm font-bold text-slate-800">{r.name}</p>
                      </div>
                      <span className={`status-badge text-xs ${s.badge}`}>{r.status.replace('_', ' ')}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="text-slate-600 font-mono">{r.phone}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Zone</span><span className="text-slate-600">{r.zone}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Vehicle</span><span className="text-slate-600">{r.vehicle}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Today's Orders</span><span className="font-bold text-slate-700">{r.orders}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Rating</span><span className="font-bold text-amber-600">{'★'.repeat(Math.floor(r.rating))} {r.rating}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'Zones' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                {ZONES.map(z => (
                  <div key={z.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-slate-800">{z.name}</p>
                      <span className={`status-badge text-xs ${z.riders > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{z.riders > 0 ? `${z.riders} riders` : 'No coverage'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-white border border-slate-200 py-1.5">
                        <p className="font-bold text-sky-700">{z.activeOrders}</p>
                        <p className="text-slate-400">Orders</p>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 py-1.5">
                        <p className="font-bold text-slate-700">{z.avgTime > 0 ? `${z.avgTime}m` : '—'}</p>
                        <p className="text-slate-400">Avg Time</p>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 py-1.5">
                        <p className="font-bold text-violet-700">{z.surcharge > 0 ? `+AED ${z.surcharge}` : 'Free'}</p>
                        <p className="text-slate-400">Surcharge</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Radius: {z.radius}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Assignments' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Order</th><th>Rider</th><th>Pickup</th><th>Assigned At</th><th>ETA</th><th>Distance</th><th>Customer</th><th>Status</th></tr></thead>
                <tbody>
                  {ASSIGNMENTS.map(a => (
                    <tr key={a.id}>
                      <td><code className="text-xs text-sky-700 font-mono font-bold">{a.orderId}</code></td>
                      <td>
                        {a.rider
                          ? <div className="flex items-center gap-1.5"><TruckIcon className="h-3.5 w-3.5 text-sky-500" /><span className="text-sm font-semibold text-slate-800">{a.rider}</span></div>
                          : <span className="text-xs text-amber-600 font-bold">⚠ Unassigned</span>}
                      </td>
                      <td className="text-xs text-slate-500">{a.pickup}</td>
                      <td className="text-xs text-slate-500">{a.assigned || '—'}</td>
                      <td className="text-xs font-semibold text-slate-600">{a.eta || '—'}</td>
                      <td className="text-xs text-slate-500">{a.distance}</td>
                      <td className="text-xs text-slate-600">{a.customer}</td>
                      <td><span className={`status-badge ${ASSIGN_STYLE[a.status]}`}>{a.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Commissions' && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Rider</th><th>Orders</th><th>Total Value</th><th>Rate</th><th>Commission</th><th>Bonus</th><th>Total Due</th></tr></thead>
                <tbody>
                  {COMMISSIONS.map((c, i) => (
                    <tr key={i}>
                      <td className="font-semibold text-slate-800">{c.rider}</td>
                      <td className="text-center font-bold text-slate-700">{c.orders}</td>
                      <td className="font-mono text-xs text-slate-600">AED {c.totalValue.toLocaleString()}</td>
                      <td className="text-xs text-slate-500">{c.commissionPct}%</td>
                      <td className="font-mono text-xs font-bold text-slate-700">AED {c.commission.toFixed(2)}</td>
                      <td className="font-mono text-xs text-amber-700">{c.bonus > 0 ? `AED ${c.bonus.toFixed(2)}` : '—'}</td>
                      <td className="font-mono text-xs font-black text-emerald-700">AED {c.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={6} className="text-right text-sm text-slate-700">Total Commissions Due:</td>
                    <td className="font-mono text-sm font-black text-emerald-700">AED {totalCommission.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
