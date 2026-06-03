import React from 'react';

export default function TabNavigation({ activeTab, setActiveTab, userRole = 'admin' }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setActiveTab('overview')}
        className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
      >
        📊 Overview
      </button>
      {userRole === 'admin' && (
        <button
          onClick={() => setActiveTab('receipts')}
          className={`btn btn-sm ${activeTab === 'receipts' ? 'btn-primary' : 'btn-secondary'}`}
        >
          🧾 Receipts
        </button>
      )}
      {userRole === 'admin' && (
        <button
          onClick={() => setActiveTab('transactions')}
          className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
        >
          💳 Transaction Report
        </button>
      )}
    </div>
  );
}
