import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilSquareIcon, XMarkIcon, MagnifyingGlassIcon,
  ClockIcon, ShieldCheckIcon, TrashIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const ROLE_STYLES = {
  admin:   'bg-rose-50   text-rose-700   border-rose-200',
  manager: 'bg-violet-50 text-violet-700 border-violet-200',
  waiter:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  kitchen: 'bg-amber-50  text-amber-700  border-amber-200',
};

const PERMISSION_GROUPS = [
  {
    label: 'Operations',
    keys: [
      { key: 'orders',       label: 'Manage Orders' },
      { key: 'kitchen',      label: 'Kitchen Display' },
      { key: 'tables',       label: 'Manage Tables' },
      { key: 'reservations', label: 'Reservations' },
      { key: 'delivery',     label: 'Delivery' },
    ],
  },
  {
    label: 'Menu & Inventory',
    keys: [
      { key: 'menu',      label: 'Manage Menu' },
      { key: 'inventory', label: 'Inventory' },
    ],
  },
  {
    label: 'Reports & Finance',
    keys: [
      { key: 'reports',    label: 'View Reports' },
      { key: 'financials', label: 'Financial Data' },
    ],
  },
  {
    label: 'Administration',
    keys: [
      { key: 'users',    label: 'Manage Users' },
      { key: 'settings', label: 'System Settings' },
    ],
  },
];

const DEFAULT_PERMISSIONS = {
  admin:   { orders: true,  kitchen: true,  tables: true,  menu: true,  reports: true,  delivery: true,  reservations: true,  users: true,  settings: true,  financials: true,  inventory: true  },
  manager: { orders: true,  kitchen: true,  tables: true,  menu: true,  reports: true,  delivery: true,  reservations: true,  users: false, settings: false, financials: true,  inventory: true  },
  waiter:  { orders: true,  kitchen: false, tables: true,  menu: false, reports: false, delivery: false, reservations: true,  users: false, settings: false, financials: false, inventory: false },
  kitchen: { orders: false, kitchen: true,  tables: false, menu: false, reports: false, delivery: false, reservations: false, users: false, settings: false, financials: false, inventory: false },
};

export default function Users() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(null); // null | 'new' | user object
  const [activityUser, setActivityUser] = useState(null);
  const [permUser, setPermUser] = useState(null);

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

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.full_name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted');
      queryClient.invalidateQueries('users');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete user');
    }
  };

  const users = data?.users || [];
  const counts = { total: users.length, admin: 0, manager: 0, waiter: 0, kitchen: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm">{counts.total} users · {counts.admin} admin · {counts.manager} manager · {counts.waiter} waiter · {counts.kitchen} kitchen</p>
        </div>
        <button onClick={() => setShowModal('new')} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search name or username…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="select w-36">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="waiter">Waiter</option>
          <option value="kitchen">Kitchen</option>
        </select>
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : users.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 font-medium">No users found</p>
          <button onClick={() => setShowModal('new')} className="btn btn-primary mt-4">
            <PlusIcon className="h-4 w-4" /> Create First User
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="card p-4 flex items-center gap-4 flex-wrap">
              {/* Avatar */}
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 border ${ROLE_STYLES[user.role] || ROLE_STYLES.waiter}`}>
                {user.full_name?.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800">{user.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${ROLE_STYLES[user.role] || ROLE_STYLES.waiter}`}>
                    {user.role}
                  </span>
                  {!user.is_active && (
                    <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-semibold">Inactive</span>
                  )}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  @{user.username}
                  {user.email && <span className="ml-2 text-slate-400">· {user.email}</span>}
                  {user.phone && <span className="ml-2 text-slate-400">· {user.phone}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Active toggle */}
                <label className="relative inline-flex items-center cursor-pointer" title={user.is_active ? 'Deactivate' : 'Activate'}>
                  <input type="checkbox" className="sr-only peer" checked={!!user.is_active} onChange={() => toggleActive(user)} />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
                <button onClick={() => setPermUser(user)} title="Manage Permissions"
                  className="btn btn-secondary btn-sm text-violet-600 border-violet-200 hover:bg-violet-50">
                  <ShieldCheckIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setActivityUser(user)} title="View Activity"
                  className="btn btn-secondary btn-sm text-sky-600 border-sky-200 hover:bg-sky-50">
                  <ClockIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setShowModal(user)} title="Edit User"
                  className="btn btn-secondary btn-sm">
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                {user.role !== 'admin' && (
                  <button onClick={() => deleteUser(user)} title="Delete"
                    className="btn btn-secondary btn-sm text-rose-500 border-rose-200 hover:bg-rose-50">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal !== null && (
        <UserFormModal
          api={api}
          user={showModal === 'new' ? null : showModal}
          onClose={() => setShowModal(null)}
          onSaved={() => { setShowModal(null); queryClient.invalidateQueries('users'); }}
        />
      )}
      {permUser && (
        <PermissionsModal
          api={api}
          user={permUser}
          onClose={() => setPermUser(null)}
          onSaved={() => { setPermUser(null); queryClient.invalidateQueries('users'); }}
        />
      )}
      {activityUser && (
        <ActivityModal
          api={api}
          user={activityUser}
          onClose={() => setActivityUser(null)}
        />
      )}
    </div>
  );
}

// ── Create / Edit user ─────────────────────────────────────────────────────
function UserFormModal({ api, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username:  user?.username  || '',
    email:     user?.email     || '',
    full_name: user?.full_name || '',
    phone:     user?.phone     || '',
    role:      user?.role      || 'waiter',
    password:  '',
    is_active: user ? !!user.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const save = async (e) => {
    e.preventDefault();
    if (!user && !form.password) return toast.error('Password is required for new users');
    if (form.password && form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (user) {
        await api.put(`/users/${user.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', payload);
        toast.success('User created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl border border-sky-100 animate-fade-in"
        style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-800">{user ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" required {...f('full_name')} placeholder="e.g. Rahim Uddin" />
            </div>
            <div>
              <label className="label">Username *</label>
              <input className="input" required {...f('username')} placeholder="e.g. rahim" />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" required {...f('email')} placeholder="rahim@cafe.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" {...f('phone')} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="label">Role *</label>
              <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">{user ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input className="input" type="password" {...f('password')}
              placeholder={user ? 'Leave blank to keep current' : 'Minimum 6 characters'} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active_chk" checked={!!form.is_active}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
              className="h-4 w-4 accent-sky-600 rounded" />
            <label htmlFor="is_active_chk" className="text-sm text-slate-600">Account active</label>
          </div>
          <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700">
            <strong>Role guide:</strong> Waiter → orders/tables only · Manager → most features, no user management · Admin → full access
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full justify-center">
            {saving ? <LoadingSpinner size="sm" /> : (user ? 'Update User' : 'Create User')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Permissions modal ───────────────────────────────────────────────────────
function PermissionsModal({ api, user, onClose, onSaved }) {
  const [perms, setPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  useQuery(
    ['user-permissions', user.id],
    () => api.get(`/users/${user.id}/permissions`).then(r => r.data),
    {
      onSuccess: d => setPerms(d.permissions),
      staleTime: 0,
    }
  );

  const toggle = key => setPerms(p => ({ ...p, [key]: !p[key] }));
  const reset = () => setPerms({ ...DEFAULT_PERMISSIONS[user.role] });

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${user.id}/permissions`, { permissions: perms });
      toast.success('Permissions saved');
      onSaved();
    } catch (e) {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-violet-100 flex flex-col max-h-[90vh] animate-fade-in"
        style={{ boxShadow: '0 24px 80px rgb(124 58 237 / 0.15)' }}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-800">Permissions — {user.full_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">Role: {user.role}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          {!perms ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : PERMISSION_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.keys.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <div className="relative inline-flex items-center">
                      <input type="checkbox" className="sr-only peer" checked={!!perms[key]} onChange={() => toggle(key)} />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={reset} className="btn btn-secondary flex-1">Reset to Role Default</button>
          <button onClick={save} disabled={saving || !perms} className="btn btn-primary flex-1 justify-center">
            {saving ? <LoadingSpinner size="sm" /> : <><ShieldCheckIcon className="h-4 w-4" />Save Permissions</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Activity log modal ──────────────────────────────────────────────────────
function ActivityModal({ api, user, onClose }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery(
    ['user-activity', user.id, page],
    () => api.get(`/users/${user.id}/activity`, { params: { page, limit: 30 } }).then(r => r.data),
    { keepPreviousData: true }
  );

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};

  const actionColors = {
    create: 'bg-emerald-50 text-emerald-700',
    update: 'bg-sky-50 text-sky-700',
    delete: 'bg-rose-50 text-rose-700',
    update_status: 'bg-amber-50 text-amber-700',
    change_table: 'bg-violet-50 text-violet-700',
    unlock_bill: 'bg-orange-50 text-orange-700',
    print_bill: 'bg-teal-50 text-teal-700',
    hold_order: 'bg-orange-50 text-orange-700',
    cancel_order: 'bg-rose-50 text-rose-700',
    change_password: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-sky-100 flex flex-col max-h-[88vh] animate-fade-in"
        style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>

        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-800">Activity Log — {user.full_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">@{user.username} · {user.role}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-50">
          {isLoading && <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>}
          {!isLoading && logs.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <ClockIcon className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="font-medium">No activity recorded yet</p>
            </div>
          )}
          {logs.map(log => (
            <div key={log.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-slate-700 font-medium capitalize">
                    {log.table_name?.replace(/_/g, ' ')}
                    {log.record_id ? <span className="text-slate-400 font-normal"> #{log.record_id}</span> : null}
                  </span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {log.ip_address && (
                <p className="text-xs text-slate-400 mt-0.5">IP: {log.ip_address}</p>
              )}
            </div>
          ))}
        </div>

        {(pagination.pages > 1) && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400">{pagination.total} total entries</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="btn btn-secondary btn-sm disabled:opacity-40">← Prev</button>
              <span className="px-3 py-1 text-slate-600">{page} / {pagination.pages}</span>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary btn-sm disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
