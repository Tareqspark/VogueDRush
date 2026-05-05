import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'VAT Invoices', 'reports': 'Reports', 'compliance': 'Compliance', 'filing': 'Filing' };
const TAB_PATH = { 'VAT Invoices': '', 'Reports': 'reports', 'Compliance': 'compliance', 'Filing': 'filing' };

const INVOICES = [
  { id: 1, reference_number: 'INV-2025-001420', doc_type: 'TAX_INVOICE', party_name: 'Al Nouri Events LLC', party_trn: '100234567890001', net_amount: 5000, tax_amount: 250, gross_amount: 5250, status: 'valid', created_at: '2025-01-20' },
  { id: 2, reference_number: 'INV-2025-001419', doc_type: 'TAX_INVOICE', party_name: 'Sunrise Catering Co.', party_trn: '100987654321002', net_amount: 12400, tax_amount: 620, gross_amount: 13020, status: 'valid', created_at: '2025-01-19' },
  { id: 3, reference_number: 'CREDIT-2025-00021', doc_type: 'CREDIT_NOTE', party_name: 'Ahmed Al Hashimi', party_trn: null, net_amount: -800, tax_amount: -40, gross_amount: -840, status: 'issued', created_at: '2025-01-18' },
  { id: 4, reference_number: 'INV-2025-001415', doc_type: 'TAX_INVOICE', party_name: 'Walk-In Customer', party_trn: null, net_amount: 380, tax_amount: 19, gross_amount: 399, status: 'valid', created_at: '2025-01-17' },
];

const REPORTS = [
  { period: 'Q4 2024 (Oct–Dec)', taxable_revenue: 842000, exempt_revenue: 12000, total_sales: 854000, output_vat: 42100, input_vat: 18400, net_vat_payable: 23700, status: 'filed', due_date: '2025-01-28' },
  { period: 'Q3 2024 (Jul–Sep)', taxable_revenue: 780000, exempt_revenue: 9800, total_sales: 789800, output_vat: 39000, input_vat: 16200, net_vat_payable: 22800, status: 'filed', due_date: '2024-10-28' },
  { period: 'Q2 2024 (Apr–Jun)', taxable_revenue: 710000, exempt_revenue: 8200, total_sales: 718200, output_vat: 35500, input_vat: 14800, net_vat_payable: 20700, status: 'paid', due_date: '2024-07-28' },
];

const COMPLIANCE = [
  { item: 'TRN Registration Active', status: 'pass', note: 'TRN 100112345678901 — valid until Dec 2026' },
  { item: 'VAT Filing Up-to-Date', status: 'pass', note: 'Q4 2024 filed on Jan 25, 2025' },
  { item: 'Tax Invoice Format', status: 'pass', note: 'All invoices include mandatory fields per FTA guidelines' },
  { item: 'Credit Note Compliance', status: 'warning', note: '3 credit notes missing customer TRN — review required' },
  { item: 'E-Invoicing Readiness', status: 'info', note: 'Phase 2 e-invoicing not yet mandatory for this category' },
];

const DEADLINES = [
  { quarter: 'Q1 2025 (Jan–Mar)', filing_deadline: '2025-04-28', payment_deadline: '2025-04-28', estimated_vat: 25400, status: 'upcoming' },
  { quarter: 'Q4 2024 (Oct–Dec)', filing_deadline: '2025-01-28', payment_deadline: '2025-01-28', estimated_vat: 23700, status: 'filed' },
  { quarter: 'Q3 2024 (Jul–Sep)', filing_deadline: '2024-10-28', payment_deadline: '2024-10-28', estimated_vat: 22800, status: 'paid' },
];

const DOC_COLORS = { TAX_INVOICE: 'bg-green-100 text-green-700', CREDIT_NOTE: 'bg-red-100 text-red-700' };
const STATUS_COLORS = { valid: 'bg-green-100 text-green-700', issued: 'bg-blue-100 text-blue-700', filed: 'bg-green-100 text-green-700', paid: 'bg-indigo-100 text-indigo-700', upcoming: 'bg-yellow-100 text-yellow-700' };
const COMPLIANCE_COLORS = { pass: 'text-green-600', warning: 'text-yellow-600', info: 'text-blue-600' };
const COMPLIANCE_ICONS = { pass: '✓', warning: '⚠', info: 'ℹ' };

export default function TaxCompliance() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/tax\/?/, '');
  const tab = PATH_MAP[subPath] || 'VAT Invoices';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/tax/${TAB_PATH[t]}` : '/tax');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax & Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">VAT invoicing, reporting, and FTA compliance management</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Generate VAT Report</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Output VAT (Q4)', value: 'AED 42,100', color: 'red' }, { label: 'Input VAT (Q4)', value: 'AED 18,400', color: 'green' }, { label: 'Net VAT Payable', value: 'AED 23,700', color: 'orange' }, { label: 'Next Filing', value: 'Apr 28, 2025', color: 'blue' }].map(k => (
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

      {tab === 'VAT Invoices' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Reference', 'Type', 'Party', 'TRN', 'Net', 'VAT', 'Gross', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{INVOICES.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{inv.reference_number}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DOC_COLORS[inv.doc_type]}`}>{inv.doc_type.replace('_', ' ')}</span></td>
                <td className="px-4 py-3 text-sm text-gray-700">{inv.party_name}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{inv.party_trn || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {Math.abs(inv.net_amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {Math.abs(inv.tax_amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">AED {Math.abs(inv.gross_amount).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Period', 'Taxable Revenue', 'Exempt', 'Output VAT', 'Input VAT', 'Net Payable', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{REPORTS.map(r => (
              <tr key={r.period} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.period}</td>
                <td className="px-4 py-3 text-sm text-gray-700">AED {r.taxable_revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-500">AED {r.exempt_revenue.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">AED {r.output_vat.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-green-600">AED {r.input_vat.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm font-bold text-orange-600">AED {r.net_vat_payable.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Compliance' && (
        <div className="space-y-3">{COMPLIANCE.map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
            <span className={`text-lg ${COMPLIANCE_COLORS[c.status]}`}>{COMPLIANCE_ICONS[c.status]}</span>
            <div>
              <p className="font-medium text-gray-900">{c.item}</p>
              <p className="text-sm text-gray-500 mt-0.5">{c.note}</p>
            </div>
          </div>
        ))}</div>
      )}

      {tab === 'Filing' && (
        <div className="space-y-3">{DEADLINES.map(d => (
          <div key={d.quarter} className={`bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center ${d.status === 'upcoming' ? 'border-yellow-200' : 'border-gray-100'}`}>
            <div>
              <p className="font-medium text-gray-900">{d.quarter}</p>
              <p className="text-sm text-gray-500 mt-0.5">Filing deadline: {d.filing_deadline} · Payment: {d.payment_deadline}</p>
              <p className="text-sm font-medium text-orange-600 mt-0.5">Estimated VAT: AED {d.estimated_vat.toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
          </div>
        ))}</div>
      )}
    </div>
  );
}
