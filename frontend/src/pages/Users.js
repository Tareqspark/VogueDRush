import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

export default function Users() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(null);

  const { data, isLoading } = useQuery(
    ['users', search, filterRole],
    () => api.get('/users', { params: { search: search || undefined, role: filterRole || undefined, limit: 100 } }).then(r => r.data)
  );

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries('users');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      queryClient.invalidateQueries('users');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const users = data?.users || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button onClick={() => setShowModal('new')} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="select w-36">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="waiter">Waiter</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center text-slate-600">No users found.</div>
      ) : (
        <div className="grid gap-3">
          {users.map(user => (
            <div key={user.id} className="card p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${user.role === 'admin' ? 'bg-sky-100 text-sky-600' : 'bg-sky-100 text-sky-600'}`}>
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">{user.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${user.role === 'admin' ? 'bg-sky-100 text-sky-600' : 'bg-sky-100 text-sky-600'}`}>{user.role}</span>
                  {!user.is_active && <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded">Inactive</span>}
                </div>
                <div className="text-sm text-slate-600">@{user.username} · {user.email}</div>
                {user.phone && <div className="text-xs text-slate-500">{user.phone}</div>}
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={!!user.is_active} onChange={() => toggleActive(user)} />
                  <div className="w-10 h-5 bg-slate-100 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
                <button onClick={() => setShowModal(user)} className="btn btn-secondary btn-sm"><PencilIcon className="h-4 w-4" /></button>
                <button onClick={() => deleteUser(user.id)} className="btn btn-error btn-sm"><XMarkIcon className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal !== null && (
        <UserModal
          api={api}
          user={showModal === 'new' ? null : showModal}
          onClose={() => setShowModal(null)}
          onSaved={() => { setShowModal(null); queryClient.invalidateQueries('users'); }}
        />
      )}
    </div>
  );
}

function UserModal({ api, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    role: user?.role || 'waiter',
    password: '',
    is_active: user ? !!user.is_active : true,
  });
  const [saving, setSaving] = useState(false);

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const save = async (e) => {
    e.preventDefault();
    if (!user && !form.password) return toast.error('Password required for new users');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (user) { await api.put(`/users/${user.id}`, payload); toast.success('User updated'); }
      else { await api.post('/users', payload); toast.success('User created'); }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">{user ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Full Name *</label><input className="input" required {...f('full_name')} /></div>
            <div><label className="label">Username *</label><input className="input" required {...f('username')} /></div>
          </div>
          <div><label className="label">Email *</label><input className="input" type="email" required {...f('email')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" {...f('phone')} /></div>
            <div>
              <label className="label">Role *</label>
              <select className="select" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                <option value="waiter">Waiter</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div><label className="label">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input className="input" type="password" {...f('password')} placeholder={user ? 'Leave blank to keep current' : 'Min 6 characters'} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={!!form.is_active} onChange={e => setForm(p => ({...p, is_active: e.target.checked}))} className="w-4 h-4 accent-sky-600" />
            <label htmlFor="is_active" className="text-sm text-slate-600">Active</label>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? <LoadingSpinner size="sm" /> : (user ? 'Update User' : 'Create User')}</button>
        </form>
      </div>
    </div>
  );
}
