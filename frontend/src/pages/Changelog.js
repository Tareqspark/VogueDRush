import React from 'react';
import { Link } from 'react-router-dom';

const pageLinks = [
  { label: 'Orders Page', href: '/orders' },
  { label: 'Reservations Page', href: '/reservations' },
  { label: 'Dashboard Page', href: '/' },
  { label: 'Menu Page', href: '/menu' },
  { label: 'Tables Page', href: '/tables' },
  { label: 'Reports Page', href: '/reports' },
];

const latestChanges = [
  {
    title: 'Advanced Order Rules',
    info: 'Delivery now requires name, phone, order time and delivery time. Takeway requires name and phone before placing order.',
  },
  {
    title: 'Cancellation Policy Updated',
    info: 'Waiters cannot cancel orders. Admin can cancel with mandatory reason, and reason is visible in enriched views.',
  },
  {
    title: 'Billing Workflow Enhanced',
    info: 'Before print: discount and payment method are required options. Card/bKash/Nagad requires last 4 digits. Print bill auto-completes order.',
  },
  {
    title: 'Dashboard Enrichment',
    info: 'Added receipt tab, transaction report tab (admin), order drill views, and interactive sold-by-name/sold-by-category charts.',
  },
  {
    title: 'Order UI and Labels',
    info: 'Order cards now have distinct colors by order type. Direct is renamed to Takeway in frontend displays.',
  },
  {
    title: 'Table Seat Display Removed',
    info: 'Seat/capacity display and input were removed from table-facing pages as requested.',
  },
  {
    title: 'Navigation Refresh Behavior',
    info: 'Switching pages now triggers data refresh so pages stay updated when navigating around.',
  },
];

export default function Changelog() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-6">
        <h1 className="text-xl font-black text-slate-800">Change Log</h1>
        <p className="text-sm text-slate-500 mt-1">Latest product updates with quick page links and short notes.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-black text-slate-800 mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {pageLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="px-3 py-1.5 rounded-lg border border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors text-sm font-semibold"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-800">Latest Update</h2>
          <span className="text-xs text-slate-400 font-semibold">04 May 2026</span>
        </div>

        <div className="space-y-3">
          {latestChanges.map((change) => (
            <div key={change.title} className="border border-slate-100 rounded-xl p-4 bg-white">
              <h3 className="text-sm font-bold text-slate-800">{change.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{change.info}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
