import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'Halls', 'bookings': 'Bookings', 'services': 'Services', 'invoices': 'Invoices' };
const TAB_PATH = { 'Halls': '', 'Bookings': 'bookings', 'Services': 'services', 'Invoices': 'invoices' };

const HALLS = [
  { id: 1, name: 'Crystal Ballroom', capacity: 600, floor: 'Ground', area_sqft: 8000, daily_rate: 25000, hourly_rate: 4000, status: 'available', amenities: 'AC, Sound System, Stage, LED Walls' },
  { id: 2, name: 'Sapphire Hall', capacity: 250, floor: '1st Floor', area_sqft: 3500, daily_rate: 12000, hourly_rate: 2000, status: 'booked', amenities: 'AC, Projector, Dance Floor' },
  { id: 3, name: 'Pearl Room', capacity: 80, floor: '2nd Floor', area_sqft: 1200, daily_rate: 5000, hourly_rate: 800, status: 'available', amenities: 'AC, Projector, Wi-Fi' },
];

const BOOKINGS = [
  { id: 1, booking_ref: 'BNQ-A1B2', hall: 'Crystal Ballroom', client_name: 'Ahmed Al Mansouri', event_date: '2025-02-20', start_time: '18:00', end_time: '23:59', guest_count: 400, total_amount: 28000, advance_paid: 14000, status: 'confirmed' },
  { id: 2, booking_ref: 'BNQ-C3D4', hall: 'Sapphire Hall', client_name: 'DIFC Investment Group', event_date: '2025-01-29', start_time: '13:00', end_time: '17:00', guest_count: 150, total_amount: 8500, advance_paid: 4000, status: 'confirmed' },
  { id: 3, booking_ref: 'BNQ-E5F6', hall: 'Pearl Room', client_name: 'Dr. Sara Al Bloom', event_date: '2025-01-25', start_time: '19:00', end_time: '22:00', guest_count: 60, total_amount: 3200, advance_paid: 1600, status: 'pending' },
];

const SERVICES = [
  { booking_ref: 'BNQ-A1B2', service: 'Floral Decoration', quantity: 1, unit_price: 3500, total: 3500 },
  { booking_ref: 'BNQ-A1B2', service: 'Photography', quantity: 1, unit_price: 2500, total: 2500 },
  { booking_ref: 'BNQ-C3D4', service: 'AV Equipment Upgrade', quantity: 1, unit_price: 1200, total: 1200 },
];

const INVOICES = BOOKINGS.map(b => ({
  ref: b.booking_ref, client: b.client_name, base: b.total_amount, addons: SERVICES.filter(s => s.booking_ref === b.booking_ref).reduce((s, r) => s + r.total, 0), advance: b.advance_paid
})).map(i => ({ ...i, total: i.base + i.addons, balance: i.base + i.addons - i.advance }));

const STATUS_COLORS = { available: 'bg-green-100 text-green-800', booked: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800' };

export default function Banquet() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/banquet\/?/, '');
  const tab = PATH_MAP[subPath] || 'Halls';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/banquet/${TAB_PATH[t]}` : '/banquet');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banquet Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage halls, bookings, services and invoices</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Booking</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total Halls', value: HALLS.length, color: 'blue' }, { label: 'Available Now', value: HALLS.filter(h => h.status === 'available').length, color: 'green' }, { label: 'Upcoming Bookings', value: BOOKINGS.length, color: 'indigo' }, { label: 'Revenue Pipeline', value: `AED ${BOOKINGS.reduce((s,b) => s + b.total_amount, 0).toLocaleString()}`, color: 'purple' }].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold text-${k.color}-600 mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {Object.keys(TAB_PATH).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'Halls' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{HALLS.map(h => (
          <div key={h.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-gray-900">{h.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status]}`}>{h.status}</span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 mb-3">
              <p>Capacity: <span className="font-medium text-gray-900">{h.capacity} guests</span></p>
              <p>Floor: {h.floor} | Area: {h.area_sqft} sqft</p>
              <p className="text-xs text-gray-500">{h.amenities}</p>
            </div>
            <div className="flex gap-3 text-sm font-medium">
              <span className="text-indigo-600">AED {h.hourly_rate.toLocaleString()}/hr</span>
              <span className="text-gray-400">|</span>
              <span className="text-green-600">AED {h.daily_rate.toLocaleString()}/day</span>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Bookings' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Ref', 'Hall', 'Client', 'Date', 'Time', 'Guests', 'Total', 'Balance', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{BOOKINGS.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.booking_ref}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.hall}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.client_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.event_date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{b.start_time}–{b.end_time}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{b.guest_count}</td>
                <td className="px-4 py-3 text-sm font-medium">AED {b.total_amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600 font-medium">AED {(b.total_amount - b.advance_paid).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>{b.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Services' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Booking Ref', 'Service', 'Qty', 'Unit Price', 'Total'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{SERVICES.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.booking_ref}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.service}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{s.quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {s.unit_price.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-medium text-indigo-600">AED {s.total.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Invoices' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Booking Ref', 'Client', 'Venue Base', 'Add-ons', 'Total', 'Advance', 'Balance Due'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{INVOICES.map(inv => (
              <tr key={inv.ref} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{inv.ref}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.client}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {inv.base.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {inv.addons.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">AED {inv.total.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-green-600">AED {inv.advance.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">AED {inv.balance.toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
