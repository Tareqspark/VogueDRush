import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, XMarkIcon, PencilSquareIcon, TrashIcon,
  BuildingOffice2Icon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const StatPill = ({ label, value, color = 'slate' }) => (
  <div className={`text-center px-3 py-2 rounded-xl bg-${color}-50 border border-${color}-100`}>
    <div className={`text-lg font-black text-${color}-700`}>{value}</div>
    <div className={`text-xs text-${color}-500 font-medium`}>{label}</div>
  </div>
);

export default function Branches() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery(
    'branches-admin',
    () => api.get('/branches/all/stats').then(r => r.data),
    { refetchInterval: 60000 }
  );

  const branches = data?.branches || [];

  const handleToggle = async (branch) => {
    try {
      await api.patch(`/branches/${branch.id}/toggle`);
      toast.success(`Branch ${branch.is_active ? 'deactivated' : 'activated'}`);
      queryClient.invalidateQueries('branches-admin');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/branches/${id}`);
      toast.success('Branch deleted');
      setConfirmDelete(null);
      queryClient.invalidateQueries('branches-admin');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Branch Management</h1>
          <p className="text-slate-500 text-sm">{branches.length} branch{branches.length !== 1 ? 'es' : ''} configured</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add Branch
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-sky-600">{branches.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Total Branches</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-emerald-600">{branches.filter(b => b.is_active).length}</div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Active</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-black text-sky-600">
            ৳{branches.reduce((s, b) => s + (b.stats?.today_revenue || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">Today's Revenue (All)</div>
        </div>
      </div>

      {/* Branch list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : branches.length === 0 ? (
        <div className="card p-12 text-center">
          <BuildingOffice2Icon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No branches yet</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4">Add First Branch</button>
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map(branch => (
            <div key={branch.id} className={`card p-5 border-l-4 ${branch.is_active ? 'border-l-emerald-400' : 'border-l-slate-300 opacity-70'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Info */}
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {branch.code}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-800 text-base">{branch.name}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${branch.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {branch.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    {branch.address && <p className="text-xs text-slate-500 mt-0.5">📍 {branch.address}</p>}
                    {branch.phone && <p className="text-xs text-slate-500">📞 {branch.phone}</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditing(branch); setShowForm(true); }}
                    className="btn btn-secondary btn-sm"
                    title="Edit"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(branch)}
                    className={`btn btn-sm ${branch.is_active ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}
                    title={branch.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {branch.is_active ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                    {branch.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(branch)}
                    className="btn btn-sm bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                <StatPill label="Today Orders"   value={branch.stats?.today_orders || 0}   color="sky" />
                <StatPill label="Today Revenue"  value={`৳${(branch.stats?.today_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="emerald" />
                <StatPill label="Active Orders"  value={branch.stats?.active_orders || 0}  color="amber" />
                <StatPill label="Total Orders"   value={branch.stats?.total_orders || 0}   color="violet" />
                <StatPill label="Total Revenue"  value={`৳${(branch.stats?.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="slate" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <BranchFormModal
          branch={editing}
          api={api}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries('branches-admin'); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-black text-slate-800 mb-2">Delete Branch?</h3>
            <p className="text-slate-500 text-sm mb-5">
              <span className="font-bold text-slate-700">{confirmDelete.name}</span> will be marked inactive.
              Existing orders are preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="btn flex-1 bg-rose-600 text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BranchFormModal({ branch, api, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:    branch?.name    || '',
    code:    branch?.code    || '',
    address: branch?.address || '',
    phone:   branch?.phone   || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and code are required');
      return;
    }
    setSubmitting(true);
    try {
      if (branch) {
        await api.put(`/branches/${branch.id}`, form);
        toast.success('Branch updated');
      } else {
        await api.post('/branches', form);
        toast.success('Branch created');
      }
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-black text-slate-800">{branch ? 'Edit Branch' : 'Add Branch'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><XMarkIcon className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Branch Name <span className="text-rose-500">*</span></label>
            <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. FoodPark Purbachol" />
          </div>
          <div>
            <label className="label">Branch Code <span className="text-rose-500">*</span></label>
            <input
              className="input uppercase"
              required
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. PUR"
              disabled={!!branch}
              title={branch ? 'Branch code cannot be changed' : ''}
            />
            {branch && <p className="text-xs text-slate-400 mt-1">Code cannot be changed after creation.</p>}
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+880..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1 justify-center">
              {submitting ? <LoadingSpinner size="sm" /> : branch ? 'Save Changes' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
