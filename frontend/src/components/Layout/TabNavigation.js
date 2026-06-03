import React from 'react';

const TABS = [
  { key: 'overview',      label: 'Overview',            icon: '📊', adminOnly: false },
  { key: 'orders',        label: 'Orders',              icon: '🛒', adminOnly: false },
  { key: 'kitchen',       label: 'Kitchen',             icon: '🍳', adminOnly: false },
  { key: 'receipts',      label: 'Receipts',            icon: '🧾', adminOnly: true  },
  { key: 'transactions',  label: 'Transaction Report',  icon: '💳', adminOnly: true  },
];

export default function TabNavigation({ activeTab, setActiveTab, userRole = 'admin' }) {
  const visible = TABS.filter(t => !t.adminOnly || userRole === 'admin' || userRole === 'manager');

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map(t => (
        <button
          key={t.key}
          onClick={() => setActiveTab(t.key)}
          className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}
