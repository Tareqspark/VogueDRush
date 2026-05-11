import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PencilIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const SETTING_GROUPS = {
  'Restaurant Info': ['restaurant_name', 'restaurant_address', 'restaurant_phone', 'restaurant_email', 'restaurant_vat_number'],
  'Financial': ['vat_percentage', 'delivery_fee'],
  'Operational': ['opening_time', 'closing_time', 'max_party_size', 'reservation_advance_days', 'table_hold_minutes'],
  'Currency': ['currency_symbol', 'currency_code'],
};

// ── Service Charge Presets Card ───────────────────────────────────────────
let _scNextId = 100; // local counter for new rows before save

function ServiceChargePresetsCard({ api }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery('sc-presets', () =>
    api.get('/settings/service-charge-presets').then(r => r.data)
  );

  const [presets, setPresets] = useState(null);
  const [saving, setSaving] = useState(false);

  const activePresets = presets ?? data?.presets ?? [];
  const isDirty = presets !== null;

  const handleChange = (idx, field, value) => {
    setPresets(activePresets.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleAdd = () => {
    setPresets([
      ...activePresets,
      { id: ++_scNextId, name: '', value: '10', type: 'percentage' }
    ]);
  };

  const handleDelete = (idx) => {
    const next = activePresets.filter((_, i) => i !== idx);
    setPresets(next.length ? next : activePresets); // keep at least 1
    if (activePresets.length <= 1) {
      toast.error('At least one preset is required');
    }
  };

  const handleSave = async () => {
    const invalid = activePresets.find(p => !p.name.trim());
    if (invalid) { toast.error('All presets must have a name'); return; }
    setSaving(true);
    try {
      await api.put('/settings/service-charge-presets', { presets: activePresets });
      toast.success('Service charge presets saved');
      queryClient.invalidateQueries('sc-presets');
      setPresets(null);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <LoadingSpinner size="sm" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-slate-50 border-b border-slate-200">
        <div>
          <h2 className="font-bold text-slate-800 text-base">Service Charge Types</h2>
          <p className="text-xs text-slate-500 mt-0.5">Waiters pick one when printing a bill</p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <>
              <button onClick={() => setPresets(null)} className="btn btn-secondary btn-sm gap-1">
                <XMarkIcon className="h-3.5 w-3.5" /> Discard
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1 disabled:opacity-60">
                {saving ? <LoadingSpinner size="sm" /> : <CheckIcon className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            </>
          )}
          <button onClick={handleAdd} className="btn btn-sm gap-1 bg-indigo-600 hover:bg-indigo-700 text-white border-0">
            <PlusIcon className="h-3.5 w-3.5" /> Add Type
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {activePresets.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No service charge types yet. Click <strong>Add Type</strong> to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {activePresets.map((p, idx) => (
              <div key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">

                {/* Color badge / index */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-slate-500 mb-0.5 block">Service Name</label>
                  <input
                    className="input w-full text-sm"
                    value={p.name}
                    onChange={e => handleChange(idx, 'name', e.target.value)}
                    placeholder="e.g. AC Room Charge"
                  />
                </div>

                {/* Amount */}
                <div className="w-28 flex-shrink-0">
                  <label className="text-xs text-slate-500 mb-0.5 block">Amount</label>
                  <input
                    className="input w-full text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.value}
                    onChange={e => handleChange(idx, 'value', e.target.value)}
                  />
                </div>

                {/* Type */}
                <div className="w-40 flex-shrink-0">
                  <label className="text-xs text-slate-500 mb-0.5 block">Charge Type</label>
                  <select
                    className="select w-full text-sm"
                    value={p.type}
                    onChange={e => handleChange(idx, 'type', e.target.value)}
                  >
                    <option value="percentage">% of Subtotal</option>
                    <option value="fixed">৳ Fixed Amount</option>
                  </select>
                </div>

                {/* Preview badge */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <label className="text-xs text-slate-500 mb-0.5 block">Preview</label>
                  <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold ${
                    p.type === 'percentage' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {p.type === 'percentage' ? `${p.value || 0}%` : `৳${parseFloat(p.value || 0).toFixed(0)}`}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(idx)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove this type"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-blue-200"></span> % of subtotal — calculated per order
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-emerald-200"></span> ৳ Fixed — same charge every time
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [editKey, setEditKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery('settings-all', () =>
    api.get('/settings').then(r => r.data)
  );

  const settings = data?.settings || [];
  const settingMap = Object.fromEntries(settings.map(s => [s.setting_key, s]));

  const startEdit = (s) => {
    setEditKey(s.setting_key);
    setEditValue(s.setting_value);
  };

  const cancelEdit = () => { setEditKey(null); setEditValue(''); };

  const saveEdit = async (key) => {
    setSaving(true);
    try {
      await api.put(`/settings/${key}`, { setting_value: editValue });
      toast.success('Setting saved');
      queryClient.invalidateQueries('settings-all');
      cancelEdit();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>

      {Object.entries(SETTING_GROUPS).map(([group, keys]) => (
        <div key={group} className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">{group}</h2>
          <div className="space-y-3">
            {keys.map(key => {
              const s = settingMap[key];
              if (!s) return null;
              const isEditing = editKey === key;
              return (
                <div key={key} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 capitalize">{key.replace(/_/g, ' ')}</div>
                    {s.description && <div className="text-xs text-slate-500">{s.description}</div>}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input className="input w-40" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(key); if (e.key === 'Escape') cancelEdit(); }} />
                      <button onClick={() => saveEdit(key)} disabled={saving} className="btn btn-success btn-sm"><CheckIcon className="h-4 w-4" /></button>
                      <button onClick={cancelEdit} className="btn btn-secondary btn-sm"><XMarkIcon className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-mono text-sm bg-slate-50 px-2 py-0.5 rounded">{String(s.parsed_value ?? s.setting_value ?? '')}</span>
                      <button onClick={() => startEdit(s)} className="btn btn-secondary btn-sm"><PencilIcon className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Service Charge Types */}
      <ServiceChargePresetsCard api={api} />

      {/* Ungrouped settings */}
      {(() => {
        const grouped = [...Object.values(SETTING_GROUPS).flat(), 'service_charge_percentage', 'service_charge_presets'];
        const rest = settings.filter(s => !grouped.includes(s.setting_key));
        if (!rest.length) return null;
        return (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Other</h2>
            <div className="space-y-3">
              {rest.map(s => {
                const isEditing = editKey === s.setting_key;
                return (
                  <div key={s.setting_key} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800 capitalize">{s.setting_key.replace(/_/g,' ')}</div>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input className="input w-40" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <button onClick={() => saveEdit(s.setting_key)} disabled={saving} className="btn btn-success btn-sm"><CheckIcon className="h-4 w-4" /></button>
                        <button onClick={cancelEdit} className="btn btn-secondary btn-sm"><XMarkIcon className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono text-sm bg-slate-50 px-2 py-0.5 rounded">{String(s.parsed_value ?? s.setting_value ?? '')}</span>
                        <button onClick={() => startEdit(s)} className="btn btn-secondary btn-sm"><PencilIcon className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
