import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  ok:       'bg-emerald-50 text-emerald-700',
  low:      'bg-amber-50 text-amber-700',
  critical: 'bg-rose-50 text-rose-600',
  none:     'bg-slate-100 text-slate-500',
};

// ── Recipe Editor Modal ───────────────────────────────────────────────────────
function RecipeEditorModal({ api, foodItem, onClose, onSaved }) {
  const { data: recipeData, isLoading: recipeLoading } = useQuery(
    ['recipe', foodItem.id],
    () => api.get(`/recipes/${foodItem.id}`).then(r => r.data),
    { staleTime: 0 }
  );
  const { data: ingData } = useQuery(
    'all-ingredients',
    () => api.get('/inventory').then(r => r.data)
  );

  const [lines, setLines] = useState(null); // null = loading from API
  const [saving, setSaving] = useState(false);

  // Initialise lines once recipe data arrives
  React.useEffect(() => {
    if (recipeData && lines === null) {
      setLines(recipeData.lines.map(l => ({
        ingredient_id: String(l.ingredient_id),
        qty_per_portion: String(l.qty_per_portion),
      })));
    }
  }, [recipeData, lines]);

  const ingredients = ingData?.ingredients || [];

  const setLine = (i, k, v) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine = () => setLines(ls => [...ls, { ingredient_id: '', qty_per_portion: '' }]);
  const removeLine = i => setLines(ls => ls.filter((_, idx) => idx !== i));

  const totalCost = (lines || []).reduce((s, l) => {
    const ing = ingredients.find(i => String(i.id) === l.ingredient_id);
    return s + (parseFloat(l.qty_per_portion) || 0) * (parseFloat(ing?.cost_price) || 0);
  }, 0);

  const costPct = foodItem.price > 0 && totalCost > 0
    ? (totalCost / foodItem.price * 100).toFixed(1)
    : null;

  const save = async () => {
    setSaving(true);
    try {
      const validLines = (lines || []).filter(l => l.ingredient_id && parseFloat(l.qty_per_portion) > 0);
      await api.put(`/recipes/${foodItem.id}`, { lines: validLines });
      toast.success('Recipe saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-black text-slate-800">{foodItem.name}</h2>
            <p className="text-xs text-slate-400">Selling price: ৳{parseFloat(foodItem.price).toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-3 mt-0.5">✕</button>
        </div>

        {/* Cost summary bar */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 mb-4 mt-3 text-sm font-semibold
          ${costPct && parseFloat(costPct) > 40 ? 'bg-rose-50 text-rose-700'
          : costPct && parseFloat(costPct) > 25 ? 'bg-amber-50 text-amber-700'
          : 'bg-emerald-50 text-emerald-700'}`}>
          <BeakerIcon className="h-4 w-4 flex-shrink-0" />
          <span>Recipe cost: ৳{totalCost.toFixed(2)}</span>
          {costPct && <span className="ml-auto opacity-70">Food cost {costPct}%</span>}
        </div>

        {/* Ingredient lines */}
        {recipeLoading || lines === null ? (
          <div className="text-center py-8 text-slate-400">Loading…</div>
        ) : (
          <div className="space-y-2">
            {lines.map((line, i) => {
              const ing = ingredients.find(x => String(x.id) === line.ingredient_id);
              const lineCost = (parseFloat(line.qty_per_portion) || 0) * (parseFloat(ing?.cost_price) || 0);
              return (
                <div key={i} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                  <select
                    className="input text-sm"
                    value={line.ingredient_id}
                    onChange={e => setLine(i, 'ingredient_id', e.target.value)}>
                    <option value="">— ingredient —</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit})
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      className="input text-right w-full pr-14"
                      type="number" min="0.0001" step="any" placeholder="Qty"
                      value={line.qty_per_portion}
                      onChange={e => setLine(i, 'qty_per_portion', e.target.value)} />
                    {ing && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        {ing.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 w-16 text-right">
                      {lineCost > 0 ? `৳${lineCost.toFixed(2)}` : ''}
                    </span>
                    <button onClick={() => removeLine(i)} className="btn btn-ghost btn-icon btn-xs text-rose-400">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addLine}
              className="btn btn-ghost btn-xs flex items-center gap-1 mt-1 text-slate-500">
              <PlusIcon className="h-3.5 w-3.5" /> Add Ingredient
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [filter, setFilter] = useState('all'); // all | hasRecipe | noRecipe

  const { data, isLoading } = useQuery(
    'recipes-list',
    () => api.get('/recipes').then(r => r.data),
    { staleTime: 30000 }
  );

  const items = (data?.items || []).filter(item => {
    if (filter === 'hasRecipe' && item.ingredient_count === 0) return false;
    if (filter === 'noRecipe'  && item.ingredient_count >  0) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const withRecipe    = (data?.items || []).filter(i => i.ingredient_count > 0).length;
  const withoutRecipe = (data?.items || []).filter(i => i.ingredient_count === 0).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Recipes & BOM</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {withRecipe} items have recipes · {withoutRecipe} items need recipes · Stock auto-deducts on sale
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Items with Recipe', value: withRecipe, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Items without Recipe', value: withoutRecipe, color: 'bg-amber-50 text-amber-700' },
          { label: 'Total Menu Items', value: (data?.items || []).length, color: 'bg-slate-50 text-slate-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative w-64">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search food items…"
            value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[['all','All'],['hasRecipe','Has Recipe'],['noRecipe','No Recipe']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${filter === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-semibold">No items match</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Food Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Sell Price</th>
                <th className="px-4 py-3 text-right">Recipe Cost</th>
                <th className="px-4 py-3 text-right">Food Cost %</th>
                <th className="px-4 py-3 text-left">Recipe</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(item => {
                const recCost = parseFloat(item.recipe_cost || 0);
                const pct     = item.price > 0 && recCost > 0
                  ? (recCost / parseFloat(item.price) * 100).toFixed(1)
                  : null;
                const pctColor = pct
                  ? parseFloat(pct) > 40 ? 'text-rose-600 font-bold'
                  : parseFloat(pct) > 25 ? 'text-amber-600 font-semibold'
                  : 'text-emerald-600 font-semibold'
                  : 'text-slate-400';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.category_name || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">৳{parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {recCost > 0 ? `৳${recCost.toFixed(2)}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right ${pctColor}`}>
                      {pct ? `${pct}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.ingredient_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {item.ingredient_count} ingredient{item.ingredient_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
                          No recipe
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditItem(item)}
                        className="btn btn-ghost btn-xs">
                        {item.ingredient_count > 0 ? 'Edit' : 'Set Recipe'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editItem && (
        <RecipeEditorModal
          api={api}
          foodItem={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); qc.invalidateQueries('recipes-list'); }}
        />
      )}
    </div>
  );
}
