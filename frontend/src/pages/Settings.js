import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const SETTING_GROUPS = {
  'Restaurant Info': ['restaurant_name', 'restaurant_address', 'restaurant_phone', 'restaurant_email'],
  'Financial': ['vat_percentage', 'service_charge_percentage', 'delivery_fee'],
  'Operational': ['opening_time', 'closing_time', 'max_party_size', 'reservation_advance_days', 'table_hold_minutes'],
  'Currency': ['currency_symbol', 'currency_code'],
};

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
  const settingMap = Object.fromEntries(settings.map(s => [s.key, s]));

  const startEdit = (s) => {
    setEditKey(s.key);
    setEditValue(s.value);
  };

  const cancelEdit = () => { setEditKey(null); setEditValue(''); };

  const saveEdit = async (key) => {
    setSaving(true);
    try {
      await api.put(`/settings/${key}`, { value: editValue });
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
                      <span className="text-slate-600 font-mono text-sm bg-slate-50 px-2 py-0.5 rounded">{s.value}</span>
                      <button onClick={() => startEdit(s)} className="btn btn-secondary btn-sm"><PencilIcon className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Ungrouped settings */}
      {(() => {
        const grouped = Object.values(SETTING_GROUPS).flat();
        const rest = settings.filter(s => !grouped.includes(s.key));
        if (!rest.length) return null;
        return (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Other</h2>
            <div className="space-y-3">
              {rest.map(s => {
                const isEditing = editKey === s.key;
                return (
                  <div key={s.key} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800 capitalize">{s.key.replace(/_/g,' ')}</div>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input className="input w-40" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <button onClick={() => saveEdit(s.key)} disabled={saving} className="btn btn-success btn-sm"><CheckIcon className="h-4 w-4" /></button>
                        <button onClick={cancelEdit} className="btn btn-secondary btn-sm"><XMarkIcon className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono text-sm bg-slate-50 px-2 py-0.5 rounded">{s.value}</span>
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
