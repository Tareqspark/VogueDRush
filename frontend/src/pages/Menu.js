import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

export default function Menu() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('items');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showItemModal, setShowItemModal] = useState(null); // null | 'new' | item object
  const [showCatModal, setShowCatModal] = useState(null);

  const { data: categoriesData } = useQuery('categories', () => api.get('/menu/categories').then(r => r.data));
  const { data: itemsData, isLoading } = useQuery(
    ['menu-items-admin', catFilter, search],
    () => api.get('/menu/items', { params: { category_id: catFilter || undefined, search: search || undefined } }).then(r => r.data)
  );

  const categories = categoriesData || [];
  const items = itemsData?.items || [];

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/items/${item.id}`, { ...item, is_available: !item.is_available });
      toast.success(`${item.name} ${!item.is_available ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries('menu-items-admin');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.delete(`/menu/categories/${id}`);
      toast.success('Category deleted');
      queryClient.invalidateQueries('categories');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Menu Management</h1>
        <button
          onClick={() => tab === 'items' ? setShowItemModal('new') : setShowCatModal('new')}
          className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> Add {tab === 'items' ? 'Item' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {['items', 'categories'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${tab === t ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="select w-44">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {isLoading ? <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div> : (
            <div className="grid gap-3">
              {items.map(item => (
                <div key={item.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      <span className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded">{item.category_name}</span>
                      {!item.is_available && <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded">Unavailable</span>}
                    </div>
                    {item.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</div>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sky-600 font-bold">৳{parseFloat(item.price).toFixed(2)}</span>
                      <span className="text-xs text-slate-400">Prep: {item.preparation_time}m</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={!!item.is_available} onChange={() => toggleAvailability(item)} />
                      <div className="w-10 h-5 bg-slate-100 peer-focus:ring-2 peer-focus:ring-accent-primary rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                    <button onClick={() => setShowItemModal(item)} className="btn btn-secondary btn-sm"><PencilIcon className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid gap-3">
          {categories.map(cat => (
            <div key={cat.id} className="card p-4 flex items-center gap-4">
              <span className="text-2xl">{cat.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-slate-800">{cat.name}</div>
                {cat.description && <div className="text-sm text-slate-500">{cat.description}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCatModal(cat)} className="btn btn-secondary btn-sm"><PencilIcon className="h-4 w-4" /></button>
                <button onClick={() => deleteCategory(cat.id)} className="btn btn-error btn-sm"><XMarkIcon className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showItemModal !== null && (
        <ItemModal
          api={api}
          categories={categories}
          item={showItemModal === 'new' ? null : showItemModal}
          onClose={() => setShowItemModal(null)}
          onSaved={() => { setShowItemModal(null); queryClient.invalidateQueries('menu-items-admin'); }}
        />
      )}

      {showCatModal !== null && (
        <CategoryModal
          api={api}
          cat={showCatModal === 'new' ? null : showCatModal}
          onClose={() => setShowCatModal(null)}
          onSaved={() => { setShowCatModal(null); queryClient.invalidateQueries('categories'); }}
        />
      )}
    </div>
  );
}

function ItemModal({ api, categories, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    category_id: item?.category_id || '',
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || '',
    vat_rate: item?.vat_rate || 0,
    preparation_time: item?.preparation_time || 15,
    display_order: item?.display_order || 0,
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (item) {
        await api.put(`/menu/items/${item.id}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/menu/items', payload);
        toast.success('Item created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">{item ? 'Edit Item' : 'New Item'}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">Category *</label>
            <select className="select" required {...f('category_id')}>
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Name *</label><input className="input" required {...f('name')} /></div>
          <div><label className="label">Description</label><textarea className="textarea h-20" {...f('description')} /></div>
          <div>
            <label className="label">Price (৳) *</label><input className="input" type="number" step="0.01" min="0" required {...f('price')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">VAT Rate (%)</label><input className="input" type="number" step="0.01" min="0" {...f('vat_rate')} /></div>
            <div><label className="label">Prep Time (min)</label><input className="input" type="number" min="1" {...f('preparation_time')} /></div>
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? <LoadingSpinner size="sm" /> : (item ? 'Update' : 'Create')}</button>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({ api, cat, onClose, onSaved }) {
  const [form, setForm] = useState({ name: cat?.name || '', description: cat?.description || '', icon: cat?.icon || '', display_order: cat?.display_order || 0 });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (cat) { await api.put(`/menu/categories/${cat.id}`, form); toast.success('Category updated'); }
      else { await api.post('/menu/categories', form); toast.success('Category created'); }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">{cat ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">Name *</label><input className="input" required {...f('name')} /></div>
          <div><label className="label">Description</label><textarea className="textarea h-20" {...f('description')} /></div>
          <div><label className="label">Icon (emoji)</label><input className="input" {...f('icon')} placeholder="🍽️" /></div>
          <div><label className="label">Display Order</label><input className="input" type="number" {...f('display_order')} /></div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? <LoadingSpinner size="sm" /> : (cat ? 'Update' : 'Create')}</button>
        </form>
      </div>
    </div>
  );
}
