import React, { useState } from 'react';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { XMarkIcon, PlusIcon, MinusIcon, TrashIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const now = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function BackdateOrderModal({ onClose, onCreated }) {
  const { api, selectedBranch } = useAuth();

  const [backdatedAt, setBackdatedAt] = useState('');
  const [reason, setReason] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [tableId, setTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLast4, setPaymentLast4] = useState('');
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: categoriesData } = useQuery('categories', () => api.get('/menu/categories').then(r => r.data));
  const { data: itemsData } = useQuery(
    ['backdate-menu', categoryFilter, menuSearch],
    () => api.get('/menu/items', { params: { is_available: true, category_id: categoryFilter || undefined, search: menuSearch || undefined } }).then(r => r.data)
  );
  const { data: tablesData } = useQuery(
    'tables-list',
    () => api.get('/tables', { params: { branch_id: selectedBranch?.id } }).then(r => r.data)
  );

  const categories = categoriesData?.categories || [];
  const menuItems  = itemsData?.items || [];
  const tables     = tablesData?.tables || [];

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.food_item_id === item.id);
      if (existing) return prev.map(c => c.food_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { food_item_id: item.id, name: item.name, price: item.promotional_price || item.price, quantity: 1 }];
    });
  };

  const updateQty = (food_item_id, delta) => {
    setCart(prev => prev
      .map(c => c.food_item_id === food_item_id ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!backdatedAt) { toast.error('Please select the order date & time'); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    if (orderType === 'dine_in' && !tableId) { toast.error('Select a table for dine-in'); return; }
    if (['card', 'bkash', 'nagad'].includes(paymentMethod) && !/^\d{4}$/.test(paymentLast4)) {
      toast.error('Enter last 4 digits for ' + paymentMethod); return;
    }

    setSubmitting(true);
    try {
      await api.post('/orders/backdate', {
        backdated_at: new Date(backdatedAt).toISOString(),
        reason: reason.trim(),
        order_type: orderType,
        table_id: orderType === 'dine_in' ? parseInt(tableId) : undefined,
        customer_name: ['delivery', 'direct'].includes(orderType) ? customerName : undefined,
        customer_phone: ['delivery', 'direct'].includes(orderType) ? customerPhone : undefined,
        items: cart.map(c => ({ food_item_id: c.food_item_id, quantity: c.quantity })),
        discount_amount: parseFloat(discount) || 0,
        payment_method: paymentMethod,
        payment_last4: ['card', 'bkash', 'nagad'].includes(paymentMethod) ? paymentLast4 : undefined,
        branch_id: selectedBranch?.id,
      });
      toast.success('Backdated order created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-violet-500" />
            <h2 className="text-base font-black text-slate-800">Backdated Order Entry</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><XMarkIcon className="h-5 w-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Date/time + Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Order Date & Time <span className="text-rose-500">*</span></label>
              <input
                type="datetime-local"
                max={now()}
                value={backdatedAt}
                onChange={e => setBackdatedAt(e.target.value)}
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">Order Type <span className="text-rose-500">*</span></label>
              <select value={orderType} onChange={e => setOrderType(e.target.value)} className="select">
                <option value="dine_in">Dine In</option>
                <option value="delivery">Delivery</option>
                <option value="direct">Takeaway</option>
              </select>
            </div>
          </div>

          {/* Table (dine_in) */}
          {orderType === 'dine_in' && (
            <div>
              <label className="label">Table <span className="text-rose-500">*</span></label>
              <select value={tableId} onChange={e => setTableId(e.target.value)} className="select" required>
                <option value="">Select table</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>Table {t.table_number}{t.location ? ` — ${t.location}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Customer (delivery/direct) */}
          {['delivery', 'direct'].includes(orderType) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="label">Customer Phone</label>
                <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="input" placeholder="Optional" />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="label">Reason for Backdated Entry <span className="text-rose-500">*</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              rows={2}
              placeholder="e.g. System was offline, order not entered at the time..."
              className="input resize-none"
            />
          </div>

          {/* Menu selector */}
          <div>
            <label className="label">Add Items</label>
            <div className="flex flex-col gap-2 mb-2">
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="select">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search items by name..."
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  className="input pl-9"
                />
                {menuSearch && (
                  <button type="button" onClick={() => setMenuSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2">
              {menuItems.length === 0 ? (
                <p className="col-span-3 text-center text-slate-400 text-sm py-4">No items found</p>
              ) : menuItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addToCart(item)}
                  className="text-left p-2 rounded-xl border border-slate-100 hover:bg-sky-50 hover:border-sky-200 transition-colors"
                >
                  <div className="text-xs font-bold text-slate-700 truncate">{item.name}</div>
                  <div className="text-xs text-sky-600 font-semibold">৳{parseFloat(item.promotional_price || item.price).toFixed(0)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 uppercase tracking-wide">Order Items</div>
              {cart.map(c => (
                <div key={c.food_item_id} className="flex items-center gap-3 px-3 py-2 border-t border-slate-50">
                  <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{c.name}</span>
                  <span className="text-xs text-sky-600 font-bold w-16 text-right">৳{(c.price * c.quantity).toFixed(0)}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(c.food_item_id, -1)} className="p-1 rounded hover:bg-slate-100"><MinusIcon className="h-3.5 w-3.5 text-slate-500" /></button>
                    <span className="w-5 text-center text-sm font-black text-slate-700">{c.quantity}</span>
                    <button type="button" onClick={() => updateQty(c.food_item_id, 1)} className="p-1 rounded hover:bg-slate-100"><PlusIcon className="h-3.5 w-3.5 text-slate-500" /></button>
                    <button type="button" onClick={() => setCart(prev => prev.filter(x => x.food_item_id !== c.food_item_id))} className="p-1 rounded hover:bg-rose-50 ml-1"><TrashIcon className="h-3.5 w-3.5 text-rose-400" /></button>
                  </div>
                </div>
              ))}
              <div className="px-3 py-2 border-t border-slate-100 text-sm font-black text-slate-700 flex justify-between">
                <span>Subtotal</span><span>৳{subtotal.toFixed(0)}</span>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Payment Method <span className="text-rose-500">*</span></label>
              <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setPaymentLast4(''); }} className="select">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>
            {['card', 'bkash', 'nagad'].includes(paymentMethod) && (
              <div>
                <label className="label">Last 4 Digits <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  maxLength={4}
                  value={paymentLast4}
                  onChange={e => setPaymentLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="input"
                />
              </div>
            )}
            <div>
              <label className="label">Discount (৳)</label>
              <input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} className="input" />
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Total: <span className="font-black text-slate-800">৳{Math.max(0, subtotal - (parseFloat(discount) || 0)).toFixed(0)}</span>
            <span className="ml-2 text-xs text-slate-400">(before VAT/SC)</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
              {submitting ? <LoadingSpinner size="sm" /> : <><ClockIcon className="h-4 w-4" /> Create Entry</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
