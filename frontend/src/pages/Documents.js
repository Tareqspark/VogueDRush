import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PATH_MAP = { '': 'All Docs', 'expiring': 'Expiring', 'categories': 'Categories', 'upload': 'Upload' };
const TAB_PATH = { 'All Docs': '', 'Expiring': 'expiring', 'Categories': 'categories', 'Upload': 'upload' };

const CATEGORIES = [
  { id: 1, name: 'Health & Safety', doc_count: 14 },
  { id: 2, name: 'Trade Licenses', doc_count: 6 },
  { id: 3, name: 'Staff Certifications', doc_count: 28 },
  { id: 4, name: 'Supplier Agreements', doc_count: 11 },
  { id: 5, name: 'Insurance Policies', doc_count: 4 },
  { id: 6, name: 'Equipment Manuals', doc_count: 9 },
];

const DOCS = [
  { id: 1, title: 'Trade License 2025', category: 'Trade Licenses', version: '1.0', uploaded_by: 'Admin', file_type: 'PDF', expiry_date: '2025-12-31', status: 'active', file_size_kb: 240 },
  { id: 2, title: 'Food Safety Permit', category: 'Health & Safety', version: '2.1', uploaded_by: 'Manager', file_type: 'PDF', expiry_date: '2025-03-15', status: 'expiring_soon', file_size_kb: 180 },
  { id: 3, title: 'Fire Safety Certificate', category: 'Health & Safety', version: '1.0', uploaded_by: 'Admin', file_type: 'PDF', expiry_date: '2025-02-28', status: 'expiring_soon', file_size_kb: 120 },
  { id: 4, title: 'Chef Ahmed — Food Handler Certificate', category: 'Staff Certifications', version: '1.0', uploaded_by: 'HR', file_type: 'PDF', expiry_date: '2026-06-30', status: 'active', file_size_kb: 95 },
  { id: 5, title: 'Al Nouri Supplier Agreement', category: 'Supplier Agreements', version: '3.0', uploaded_by: 'Procurement', file_type: 'DOCX', expiry_date: '2024-12-31', status: 'expired', file_size_kb: 310 },
];

const EXPIRING = DOCS.filter(d => d.status === 'expiring_soon' || d.status === 'expired');

const STATUS_COLORS = { active: 'bg-green-100 text-green-800', expiring_soon: 'bg-yellow-100 text-yellow-800', expired: 'bg-red-100 text-red-800', archived: 'bg-gray-100 text-gray-500' };

export default function Documents() {
  const location = useLocation();
  const navigate = useNavigate();
  const subPath = location.pathname.replace(/^\/documents\/?/, '');
  const tab = PATH_MAP[subPath] || 'All Docs';
  const setTab = (t) => navigate(TAB_PATH[t] ? `/documents/${TAB_PATH[t]}` : '/documents');

  const [form, setForm] = useState({ title: '', category: '', notes: '' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-sm text-gray-500 mt-1">Centralize and track all business documents and certifications</p>
        </div>
        <button onClick={() => setTab('Upload')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Upload Doc</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total Documents', value: DOCS.length, color: 'blue' }, { label: 'Active', value: DOCS.filter(d => d.status === 'active').length, color: 'green' }, { label: 'Expiring Soon', value: DOCS.filter(d => d.status === 'expiring_soon').length, color: 'yellow' }, { label: 'Expired', value: DOCS.filter(d => d.status === 'expired').length, color: 'red' }].map(k => (
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

      {tab === 'All Docs' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>{['Title', 'Category', 'Ver.', 'Uploaded By', 'Type', 'Expiry', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{DOCS.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.title}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.category}</td>
                <td className="px-4 py-3 text-sm text-gray-500">v{d.version}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.uploaded_by}</td>
                <td className="px-4 py-3 text-xs font-mono bg-gray-100 text-gray-600 rounded">{d.file_type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.expiry_date}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status.replace('_', ' ')}</span></td>
                <td className="px-4 py-3"><button className="text-xs text-indigo-600 hover:text-indigo-800">Download</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'Expiring' && (
        <div className="space-y-3">{EXPIRING.map(d => (
          <div key={d.id} className={`rounded-xl border p-4 flex justify-between items-center ${d.status === 'expired' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div>
              <p className="font-medium text-gray-900">{d.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">Category: {d.category} · Uploaded by: {d.uploaded_by}</p>
              <p className={`text-sm font-medium mt-0.5 ${d.status === 'expired' ? 'text-red-600' : 'text-yellow-700'}`}>
                Expiry: {d.expiry_date} — {d.status === 'expired' ? 'EXPIRED' : 'Expiring Soon'}
              </p>
            </div>
            <button className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Renew</button>
          </div>
        ))}</div>
      )}

      {tab === 'Categories' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{CATEGORIES.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-900">{c.name}</p>
              <p className="text-sm text-gray-500 mt-1">{c.doc_count} documents</p>
            </div>
            <span className="text-2xl font-bold text-indigo-300">{c.doc_count}</span>
          </div>
        ))}</div>
      )}

      {tab === 'Upload' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg">
          <h2 className="font-semibold text-gray-900 mb-4">Upload New Document</h2>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Trade License 2025" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Select category...</option>{CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500">Drag & drop or click to select file</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX up to 10MB</p>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Optional notes..." /></div>
            <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Upload Document</button>
          </div>
        </div>
      )}
    </div>
  );
}
