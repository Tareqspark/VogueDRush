import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon,
  ShoppingCartIcon, TrashIcon, MinusIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  done:      'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
};

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Direct' };

export default function Orders() {
  const { api, user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────
  const { data: ordersData, isLoading } = useQuery(
    ['orders', filterStatus, filterType],
    () => api.get('/orders', { params: { status: filterStatus || undefined, order_type: filterType || undefined, limit: 100 } }).then(r => r.data),
    { refetchInterval: 15000 }
  );

  const { data: orderDetail } = useQuery(
    ['order-detail', selectedOrder],
    () => api.get(`/orders/${selectedOrder}`).then(r => r.data),
    { enabled: !!selectedOrder }
  );

  // ── Status update ──────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      toast.success(`Order marked as ${status}`);
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries(['order-detail', id]);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update');
    }
  };

  const orders = ordersData?.orders || [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">Orders</h1>
          <p className="text-slate-500 text-sm">{orders.length} orders found</p>
        </div>
        <button onClick={() => setShowNewOrder(true)} className="btn btn-primary">
          <PlusIcon className="h-4 w-4" /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          {['pending','preparing','ready','done','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
          <option value="">All Types</option>
          <option value="dine_in">Dine In</option>
          <option value="delivery">Delivery</option>
          <option value="direct">Direct</option>
        </select>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="card p-16 text-center">
          <ShoppingCartIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id}
              onClick={() => setSelectedOrder(order.id)}
              className="card p-4 cursor-pointer hover:shadow-card-hover hover:border-sky-200 transition-all group">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                    {TYPE_LABELS[order.order_type]}
                  </span>
                  {order.table_number && (
                    <span className="text-sm text-slate-500 font-medium">Table {order.table_number}</span>
                  )}
                  {order.customer_name && (
                    <span className="text-sm text-slate-500">{order.customer_name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <span className="font-black text-slate-800">৳{parseFloat(order.total_amount).toFixed(0)}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium">by {order.waiter_full_name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && orderDetail && (
        <OrderDetailModal
          detail={orderDetail}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateStatus}
          userRole={user.role}
          userId={user.id}
        />
      )}

      {/* New Order Modal */}
      {showNewOrder && (
        <NewOrderModal
          api={api}
          userId={user.id}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => {
            setShowNewOrder(false);
            queryClient.invalidateQueries('orders');
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Order Detail Modal
// ────────────────────────────────────────────────────────────────
function OrderDetailModal({ detail, onClose, onUpdateStatus, userRole, userId }) {
  const { order, items, payments } = detail;
  const nextStatus = { pending: 'preparing', preparing: 'ready', ready: 'done' }[order.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-sky-100 animate-fade-in"
        style={{ boxShadow: '0 20px 60px rgb(2 132 199 / 0.15)' }}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">{order.order_number}</h2>
              <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${STATUS_COLORS[order.status]}`}>{order.status}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">{TYPE_LABELS[order.order_type]}</span>
            {order.table_number && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border font-semibold">Table {order.table_number}</span>}
            {order.customer_name && <span className="text-xs text-slate-500">{order.customer_name} {order.customer_phone}</span>}
          </div>

          {/* Items */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-700 font-medium">{item.item_name} <span className="text-slate-400">× {item.quantity}</span></span>
                <span className="font-bold text-slate-800">৳{parseFloat(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>৳{parseFloat(order.subtotal).toFixed(2)}</span></div>
            {parseFloat(order.vat_amount) > 0 && <div className="flex justify-between text-slate-500"><span>VAT</span><span>৳{parseFloat(order.vat_amount).toFixed(2)}</span></div>}
            {parseFloat(order.service_charge) > 0 && <div className="flex justify-between text-slate-500"><span>Service Charge</span><span>৳{parseFloat(order.service_charge).toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-slate-800 text-base border-t border-slate-100 pt-2"><span>Total</span><span>৳{parseFloat(order.total_amount).toFixed(2)}</span></div>
          </div>

          {order.special_instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <span className="font-bold">Note: </span>{order.special_instructions}
            </div>
          )}

          {!['done','cancelled'].includes(order.status) && (
            <div className="flex gap-2 pt-1">
              {{ pending: 'preparing', preparing: 'ready', ready: 'done' }[order.status] && (
                <button onClick={() => onUpdateStatus(order.id, { pending: 'preparing', preparing: 'ready', ready: 'done' }[order.status])}
                  className="btn btn-primary flex-1">
                  Mark as {{ pending: 'Preparing', preparing: 'Ready', ready: 'Done' }[order.status]}
                </button>
              )}
              {(userRole === 'admin' || order.waiter_id === userId) && (
                <button onClick={() => onUpdateStatus(order.id, 'cancelled')} className="btn btn-error px-4">
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// New Order Modal (POS)
// ────────────────────────────────────────────────────────────────
function NewOrderModal({ api, userId, onClose, onCreated }) {
  const [orderType, setOrderType] = useState('direct');
  const [selectedTable, setSelectedTable] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: categoriesData } = useQuery('categories', () => api.get('/menu/categories').then(r => r.data));
  const { data: itemsData } = useQuery(['menu-items', categoryFilter, search], () =>
    api.get('/menu/items', { params: { is_available: true, category_id: categoryFilter || undefined, search: search || undefined } }).then(r => r.data)
  );
  const { data: tablesData } = useQuery('tables-available', () =>
    api.get('/tables', { params: { status: 'available' } }).then(r => r.data)
  );

  const categories = categoriesData || [];
  const items = itemsData?.items || [];
  const tables = tablesData?.tables || [];

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.promotional_price || item.price, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const vatRate = 0.15;
  const serviceRate = orderType === 'dine_in' ? 0.10 : 0;
  const vat = subtotal * vatRate;
  const service = subtotal * serviceRate;
  const total = subtotal + vat + service;

  const submit = async () => {
    if (cart.length === 0) return toast.error('Add items to cart');
    if (orderType === 'dine_in' && !selectedTable) return toast.error('Select a table');
    if (orderType === 'delivery' && (!customerName || !customerPhone || !address)) return toast.error('Fill customer details');

    setSubmitting(true);
    try {
      const payload = {
        order_type: orderType,
        table_id: orderType === 'dine_in' ? parseInt(selectedTable) : undefined,
        customer_name: orderType === 'delivery' ? customerName : undefined,
        customer_phone: orderType === 'delivery' ? customerPhone : undefined,
        special_instructions: specialInstructions || undefined,
        items: cart.map(c => ({ food_item_id: c.id, quantity: c.qty })),
        delivery_details: orderType === 'delivery' ? { customer_address: address, delivery_phone: customerPhone } : undefined,
      };
      await api.post('/orders', payload);
      toast.success('Order created!');
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-sky-950/30 backdrop-blur-sm">
      <div className="relative bg-white flex flex-col lg:flex-row w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden border border-sky-100"
        style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
        {/* Left: Menu */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-100">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-slate-800">New Order</h2>
              <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {/* Order type */}
            <div className="flex gap-2 mb-3">
              {['direct','dine_in','delivery'].map(t => (
                <button key={t} onClick={() => setOrderType(t)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    orderType === t
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
                  }`}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {orderType === 'dine_in' && (
              <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} className="select mb-2">
                <option value="">Select Table</option>
                {tables.map(t => <option key={t.id} value={t.id}>Table {t.table_number} (cap {t.capacity}) - {t.location}</option>)}
              </select>
            )}
            {orderType === 'delivery' && (
              <div className="space-y-2">
                <input className="input" placeholder="Customer Name *" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input className="input" placeholder="Phone *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                <input className="input" placeholder="Delivery Address *" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            )}
            <div className="relative mt-2">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {/* Categories */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-slate-100">
            <button onClick={() => setCategoryFilter('')}
              className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-all ${!categoryFilter ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>All</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-all ${categoryFilter == c.id ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
            {items.map(item => (
              <button key={item.id} onClick={() => addToCart(item)}
                className="bg-white border border-slate-100 rounded-xl p-3 text-left hover:border-sky-300 hover:shadow-card-hover transition-all active:scale-95">
                <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{item.category_name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sky-600 font-black text-sm">৳{parseFloat(item.promotional_price || item.price).toFixed(0)}</span>
                  {item.promotional_price && <span className="text-xs text-slate-300 line-through">৳{parseFloat(item.price).toFixed(0)}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-80 flex flex-col bg-slate-50">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-white">
            <ShoppingCartIcon className="h-5 w-5 text-sky-500" />
            <h2 className="font-black text-slate-800">Cart ({cart.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center mt-8">
                <ShoppingCartIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No items added</p>
              </div>
            ) : cart.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400">৳{parseFloat(c.price).toFixed(0)} each</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(c.id, -1)} className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                    <MinusIcon className="h-3 w-3 text-slate-600" />
                  </button>
                  <span className="w-6 text-center text-sm font-black text-slate-800">{c.qty}</span>
                  <button onClick={() => changeQty(c.id, 1)} className="h-6 w-6 rounded-lg bg-sky-100 flex items-center justify-center hover:bg-sky-200">
                    <PlusIcon className="h-3 w-3 text-sky-600" />
                  </button>
                  <button onClick={() => setCart(p => p.filter(x => x.id !== c.id))} className="h-6 w-6 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 ml-1">
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
            <textarea className="textarea text-sm h-16" placeholder="Special instructions..." value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} />
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-100">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>৳{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>VAT (15%)</span><span>৳{vat.toFixed(2)}</span></div>
              {service > 0 && <div className="flex justify-between text-slate-500"><span>Service (10%)</span><span>৳{service.toFixed(2)}</span></div>}
              <div className="flex justify-between font-black text-slate-800 text-base border-t border-slate-200 pt-2"><span>Total</span><span>৳{total.toFixed(2)}</span></div>
            </div>
            <button onClick={submit} disabled={submitting || cart.length === 0}
              className="btn btn-primary w-full disabled:opacity-50 justify-center">
              {submitting ? <LoadingSpinner size="sm" /> : <><CheckIcon className="h-4 w-4" />Place Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
