import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { XMarkIcon, PlusIcon, MinusIcon, TrashIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import { itemPrice } from '../../utils/price';

// datetime-local wants local time without a zone.
const toLocalInput = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const money = (n) => `৳${n.toFixed(2)}`;

export default function BackdateOrderModal({ onClose, onCreated }) {
  const { api, user, selectedBranch } = useAuth();

  const [backdatedAt, setBackdatedAt] = useState('');
  const [reason, setReason] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [tableId, setTableId] = useState('');
  const [servedBy, setServedBy] = useState(user?.id ? String(user.id) : '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [discount, setDiscount] = useState('0');
  const [vatPct, setVatPct] = useState(null);   // null until today's settings load
  const [scPct, setScPct] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLast4, setPaymentLast4] = useState('');
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Staff to credit, the manager day limit, and today's charges to prefill.
  const { data: options } = useQuery(
    ['backdate-options', selectedBranch?.id],
    () => api.get('/orders/backdate/options').then(r => r.data)
  );
  useEffect(() => {
    if (!options) return;
    setVatPct(prev => prev ?? String(options.vat_percentage));
    setScPct(prev => prev ?? String(options.service_charge_percentage));
  }, [options]);

  const { data: categoriesData } = useQuery('categories', () => api.get('/menu/categories').then(r => r.data));
  // No is_available filter: availability is about today, and this sale is in the past.
  const { data: itemsData } = useQuery(
    ['backdate-menu', categoryFilter, menuSearch],
    () => api.get('/menu/items', { params: { category_id: categoryFilter || undefined, search: menuSearch || undefined } }).then(r => r.data)
  );
  const { data: tablesData } = useQuery(
    'tables-list',
    () => api.get('/tables', { params: { branch_id: selectedBranch?.id } }).then(r => r.data)
  );

  const categories = categoriesData?.categories || [];
  const menuItems  = itemsData?.items || [];
  const tables     = tablesData?.tables || [];
  const staff      = options?.staff || [];
  const minDate    = options?.max_days != null ? toLocalInput(Date.now() - options.max_days * 86400000) : undefined;

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.food_item_id === item.id);
      if (existing) return prev.map(c => c.food_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      const today = itemPrice(item);
      return [...prev, { food_item_id: item.id, name: item.name, todayPrice: today, price: String(today), quantity: 1 }];
    });
  };

  const updateLine = (food_item_id, changes) => {
    setCart(prev => prev.map(c => c.food_item_id === food_item_id ? { ...c, ...changes } : c));
  };

  const updateQty = (food_item_id, delta) => {
    setCart(prev => prev
      .map(c => c.food_item_id === food_item_id ? { ...c, quantity: c.quantity + delta } : c)
      .filter(c => c.quantity > 0)
    );
  };

  // Mirrors the server: VAT and service charge on the subtotal, delivery fee on
  // delivery orders, and the discount taken off the total — the same as a normal bill.
  const subtotal = cart.reduce((s, c) => s + num(c.price) * c.quantity, 0);
  const vatRate = num(vatPct);
  const scRate = orderType === 'dine_in' ? num(scPct) : 0;
  const deliveryFee = orderType === 'delivery' ? num(options?.delivery_fee) : 0;
  const vat = subtotal * vatRate / 100;
  const serviceCharge = subtotal * scRate / 100;
  const discountAmount = Math.max(0, num(discount));
  const total = Math.max(0, subtotal + vat + serviceCharge + deliveryFee - discountAmount);

  // Send a value only when it differs from today's, so the audit log lists real overrides.
  const changedFrom = (input, today) => (input !== null && num(input) !== num(today) ? num(input) : undefined);
  const validPct = (v) => v !== '' && num(v) >= 0 && num(v) <= 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!backdatedAt) { toast.error('Please select the order date & time'); return; }
    if (minDate && backdatedAt < minDate) { toast.error(`Managers can backdate up to ${options.max_days} days`); return; }
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    if (cart.some(c => c.price === '' || num(c.price) < 0)) { toast.error('Every item needs a price of 0 or more'); return; }
    if (!validPct(vatPct) || (orderType === 'dine_in' && !validPct(scPct))) { toast.error('VAT and service charge must be 0–100%'); return; }
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
        served_by: servedBy ? parseInt(servedBy) : undefined,
        customer_name: ['delivery', 'direct'].includes(orderType) ? customerName : undefined,
        customer_phone: ['delivery', 'direct'].includes(orderType) ? customerPhone : undefined,
        delivery_details: orderType === 'delivery'
          ? { customer_address: address, delivery_notes: deliveryNotes || undefined }
          : undefined,
        items: cart.map(c => ({
          food_item_id: c.food_item_id,
          quantity: c.quantity,
          unit_price: num(c.price) !== c.todayPrice ? num(c.price) : undefined,
        })),
        vat_percentage: changedFrom(vatPct, options?.vat_percentage),
        service_charge_percentage: orderType === 'dine_in' ? changedFrom(scPct, options?.service_charge_percentage) : undefined,
        discount_amount: discountAmount,
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

          {/* Date/time + type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Order Date & Time <span className="text-rose-500">*</span></label>
              <input
                type="datetime-local"
                min={minDate}
                max={toLocalInput(new Date())}
                value={backdatedAt}
                onChange={e => setBackdatedAt(e.target.value)}
                required
                className="input"
              />
              {options?.max_days != null && (
                <p className="text-xs text-slate-400 mt-1">Managers can go back up to {options.max_days} days.</p>
              )}
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

          {/* Table (dine_in) + served by */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="label">Served By</label>
              <select value={servedBy} onChange={e => setServedBy(e.target.value)} className="select">
                {staff.length === 0 && user && <option value={user.id}>{user.full_name || user.username}</option>}
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.username} · {s.role}{s.is_active ? '' : ' (inactive)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer (delivery/direct) */}
          {['delivery', 'direct'].includes(orderType) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="label">Customer Phone</label>
                <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="input" placeholder="Optional" />
              </div>
              {orderType === 'delivery' && (
                <>
                  <div>
                    <label className="label">Delivery Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="input" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="label">Delivery Notes</label>
                    <input type="text" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="input" placeholder="Optional" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="label">Reason for Backdated Entry <span className="text-rose-500">*</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              maxLength={500}
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
                  <div className="text-xs text-sky-600 font-semibold">
                    ৳{itemPrice(item).toFixed(0)}
                    {!item.is_available && <span className="ml-1 text-slate-400 font-normal">· unavailable today</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart — the price is editable: enter what was actually charged that day */}
          {cart.length > 0 && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 uppercase tracking-wide flex justify-between">
                <span>Order Items</span><span className="normal-case font-semibold">Unit price as charged</span>
              </div>
              {cart.map(c => (
                <div key={c.food_item_id} className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-50">
                  <span className="flex-1 min-w-[8rem] text-sm font-semibold text-slate-700 truncate">{c.name}</span>
                  <input
                    type="number" min="0" step="any"
                    value={c.price}
                    onChange={e => updateLine(c.food_item_id, { price: e.target.value })}
                    className={`input w-20 py-1 text-right text-sm ${num(c.price) !== c.todayPrice ? 'border-violet-300 bg-violet-50' : ''}`}
                    title={`Today's price: ৳${c.todayPrice}`}
                  />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => updateQty(c.food_item_id, -1)} className="p-1 rounded hover:bg-slate-100"><MinusIcon className="h-3.5 w-3.5 text-slate-500" /></button>
                    <span className="w-5 text-center text-sm font-black text-slate-700">{c.quantity}</span>
                    <button type="button" onClick={() => updateQty(c.food_item_id, 1)} className="p-1 rounded hover:bg-slate-100"><PlusIcon className="h-3.5 w-3.5 text-slate-500" /></button>
                  </div>
                  <span className="text-xs text-sky-600 font-bold w-16 text-right">৳{(num(c.price) * c.quantity).toFixed(0)}</span>
                  <button type="button" onClick={() => setCart(prev => prev.filter(x => x.food_item_id !== c.food_item_id))} className="p-1 rounded hover:bg-rose-50"><TrashIcon className="h-3.5 w-3.5 text-rose-400" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Charges — prefilled with today's settings; change them to match the day */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">VAT %</label>
              <input type="number" min="0" max="100" step="any" value={vatPct ?? ''} onChange={e => setVatPct(e.target.value)} className="input" />
            </div>
            {orderType === 'dine_in' && (
              <div>
                <label className="label">Service Charge %</label>
                <input type="number" min="0" max="100" step="any" value={scPct ?? ''} onChange={e => setScPct(e.target.value)} className="input" />
              </div>
            )}
            <div>
              <label className="label">Discount (৳)</label>
              <input type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} className="input" />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {/* What will be saved — the same breakdown the bill would show */}
          {cart.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>VAT ({vatRate}%)</span><span>{money(vat)}</span></div>
              {orderType === 'dine_in' && (
                <div className="flex justify-between text-slate-600"><span>Service charge ({scRate}%)</span><span>{money(serviceCharge)}</span></div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-slate-600"><span>Delivery fee</span><span>{money(deliveryFee)}</span></div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600"><span>Discount</span><span>−{money(discountAmount)}</span></div>
              )}
              <div className="flex justify-between font-black text-slate-800 border-t border-slate-200 pt-1">
                <span>Recorded as paid ({paymentMethod})</span><span>{money(total)}</span>
              </div>
            </div>
          )}

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            Total: <span className="font-black text-slate-800">{money(total)}</span>
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
