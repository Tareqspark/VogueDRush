import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, XMarkIcon, CalendarIcon, ShoppingCartIcon,
  MagnifyingGlassIcon, MinusIcon, TrashIcon, CheckIcon,
  PrinterIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  completed: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function Reservations() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [orderReservation, setOrderReservation] = useState(null);

  const { data, isLoading } = useQuery(
    ['reservations', filterStatus, filterDate],
    () => api.get('/reservations', {
      params: {
        status: filterStatus || undefined,
        start_date: filterDate || undefined,
        end_date: filterDate || undefined,
        limit: 100,
      }
    }).then(r => r.data),
    { refetchInterval: 30000 }
  );

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      toast.success(`Reservation ${status}`);
      queryClient.invalidateQueries('reservations');
    } catch (e) {
      toast.error(e.response?.data?.error?.message || e.response?.data?.message || 'Failed');
    }
  };

  const reservations = data?.reservations || [];
  const today = new Date().toISOString().split('T')[0];
  const todayCount = reservations.filter(r => r.reservation_date?.startsWith(today)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reservations</h1>
          {todayCount > 0 && <p className="text-sm text-sky-600">{todayCount} reservations today</p>}
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <PlusIcon className="h-4 w-4" /> New Reservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          {['pending','confirmed','cancelled','completed'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="input w-44" />
        {filterDate && <button onClick={() => setFilterDate('')} className="btn btn-secondary btn-sm">Clear Date</button>}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : reservations.length === 0 ? (
        <div className="card p-12 text-center text-slate-600">No reservations found.</div>
      ) : (
        <div className="grid gap-3">
          {reservations.map(res => {
            const isToday = res.reservation_date?.startsWith(today);
            return (
              <div key={res.id} className={`card p-4 ${isToday ? 'border-sky-500/50' : ''}`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{res.customer_name}</span>
                      {isToday && <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded">Today</span>}
                    </div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      {res.customer_phone}
                      {res.customer_email && ` · ${res.customer_email}`}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium capitalize ${STATUS_COLORS[res.status]}`}>{res.status}</span>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                    {res.reservation_date} at {res.reservation_time?.slice(0,5)}
                  </div>
                  <div>Party of {res.party_size}</div>
                  {res.table_number && <div>Table {res.table_number}</div>}
                </div>
                {res.special_requests && (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">{res.special_requests}</div>
                )}
                {res.pre_order_number && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-sky-600 font-semibold">
                    <ShoppingCartIcon className="h-3.5 w-3.5" />
                    Order: {res.pre_order_number}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {res.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(res.id, 'confirmed')} className="btn btn-success btn-sm">Confirm</button>
                      <button onClick={() => updateStatus(res.id, 'cancelled')} className="btn btn-error btn-sm">Cancel</button>
                    </>
                  )}
                  {res.status === 'confirmed' && (
                    <>
                      <button onClick={() => setOrderReservation(res)}
                        className="btn btn-primary btn-sm flex items-center gap-1.5">
                        <ShoppingCartIcon className="h-3.5 w-3.5" />
                        {res.pre_order_id ? 'Manage Order' : 'Start Order'}
                      </button>
                      <button onClick={() => updateStatus(res.id, 'cancelled')} className="btn btn-error btn-sm">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NewReservationModal
          api={api}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); queryClient.invalidateQueries('reservations'); }}
        />
      )}

      {orderReservation && (
        <ReservationOrderModal
          api={api}
          reservation={orderReservation}
          onClose={() => setOrderReservation(null)}
          onCompleted={() => { setOrderReservation(null); queryClient.invalidateQueries('reservations'); }}
        />
      )}
    </div>
  );
}

function NewReservationModal({ api, onClose, onCreated }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    party_size: 2, reservation_date: today, reservation_time: '19:00',
    table_id: '', special_requests: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: tablesData } = useQuery('tables-all', () =>
    api.get('/tables').then(r => r.data)
  );
  const tables = tablesData?.tables || [];

  const f = (k) => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/reservations', {
        ...form,
        party_size: parseInt(form.party_size),
        table_id: form.table_id ? parseInt(form.table_id) : undefined,
      });
      toast.success('Reservation created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">New Reservation</h2>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-500" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">Customer Name *</label><input className="input" required {...f('customer_name')} /></div>
          <div><label className="label">Phone *</label><input className="input" required {...f('customer_phone')} /></div>
          <div><label className="label">Email <span className="text-slate-400 font-normal text-xs">(optional)</span></label><input className="input" type="email" {...f('customer_email')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input className="input" type="date" required {...f('reservation_date')} /></div>
            <div><label className="label">Time *</label><input className="input" type="time" required {...f('reservation_time')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Party Size *</label><input className="input" type="number" min={1} max={50} required {...f('party_size')} /></div>
            <div>
              <label className="label">Table (optional)</label>
              <select className="select" {...f('table_id')}>
                <option value="">Auto-assign</option>
                {tables.map(t => <option key={t.id} value={t.id}>Table {t.table_number}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Special Requests</label><textarea className="textarea h-20" {...f('special_requests')} /></div>
          <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? <LoadingSpinner size="sm" /> : 'Create Reservation'}</button>
        </form>
      </div>
    </div>
  );
}

function ReservationOrderModal({ api, reservation, onClose, onCompleted }) {
  const [step, setStep] = useState(reservation.pre_order_id ? 'order' : 'menu');
  const [orderId, setOrderId] = useState(reservation.pre_order_id || null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [printing, setPrinting] = useState(false);

  const { data: categoriesData } = useQuery(
    'res-categories',
    () => api.get('/menu/categories').then(r => r.data),
    { enabled: step === 'menu' }
  );
  const { data: itemsData } = useQuery(
    ['res-menu-items', categoryFilter, search],
    () => api.get('/menu/items', {
      params: { is_available: true, category_id: categoryFilter || undefined, search: search || undefined }
    }).then(r => r.data),
    { enabled: step === 'menu' }
  );
  const { data: orderDetail, isLoading: loadingOrder } = useQuery(
    ['res-order-detail', orderId],
    () => api.get(`/orders/${orderId}`).then(r => r.data),
    { enabled: !!orderId && step === 'order', refetchInterval: 10000 }
  );

  const categories = categoriesData || [];
  const items = itemsData?.items || [];
  const order = orderDetail?.order;
  const orderItems = (orderDetail?.items || []).filter(i => i.status !== 'cancelled');

  const addToCart = (item) =>
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: parseFloat(item.promotional_price || item.price), qty: 1 }];
    });

  const changeQty = (id, delta) =>
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const vat = subtotal * 0.15;
  const service = subtotal * 0.10;
  const total = subtotal + vat + service;

  const submitOrder = async () => {
    if (cart.length === 0) return toast.error('Add items to cart first');
    setSubmitting(true);
    try {
      const hasTable = reservation.table_id && Number.isInteger(Number(reservation.table_id));
      const res = await api.post('/orders', {
        order_type: hasTable ? 'dine_in' : 'direct',
        ...(hasTable ? { table_id: Number(reservation.table_id) } : {}),
        special_instructions: specialInstructions || undefined,
        items: cart.map(c => ({ food_item_id: c.id, quantity: c.qty })),
      });
      const newOrderId = res.data.order_id;
      await api.patch(`/reservations/${reservation.id}/link-order`, { order_id: newOrderId });
      setOrderId(newOrderId);
      setStep('order');
      toast.success('Order created!');
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.response?.data?.message || 'Failed to create order';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintBill = async () => {
    setPrinting(true);
    try {
      const res = await api.post(`/orders/${orderId}/bill`);
      const html = buildReceiptHTML(res.data);
      const w = window.open('', '_blank', 'width=380,height=650');
      if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
      await api.patch(`/reservations/${reservation.id}/status`, { status: 'completed' });
      toast.success('Bill printed! Reservation completed.');
      onCompleted();
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.response?.data?.message || 'Failed to print bill';
      toast.error(msg);
    } finally {
      setPrinting(false);
    }
  };

  const handleMarkDone = async () => {
    try {
      if (order?.status !== 'done') {
        await api.patch(`/orders/${orderId}/status`, { status: 'done' });
      }
      await api.patch(`/reservations/${reservation.id}/status`, { status: 'completed' });
      toast.success('Reservation completed!');
      onCompleted();
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.response?.data?.message || 'Failed';
      toast.error(msg);
    }
  };

  const ORDER_STATUS_COLORS = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    preparing: 'bg-blue-50 text-blue-700 border-blue-200',
    ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    done:      'bg-slate-100 text-slate-500 border-slate-200',
    cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  };

  if (step === 'order') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col"
          style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="flex-1">
              <h2 className="font-black text-slate-800">{reservation.customer_name}</h2>
              <p className="text-xs text-slate-400">
                Table {reservation.table_number || '—'} · {reservation.reservation_date} {reservation.reservation_time?.slice(0,5)} · Party of {reservation.party_size}
              </p>
            </div>
            <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {loadingOrder ? (
              <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
            ) : order ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sky-600">{order.order_number}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${ORDER_STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                  {orderItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-700 font-medium">{item.item_name} <span className="text-slate-400">×{item.quantity}</span></span>
                      <span className="font-bold text-slate-800">৳{parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>৳{parseFloat(order.subtotal).toFixed(2)}</span></div>
                  {parseFloat(order.vat_amount) > 0 && <div className="flex justify-between text-slate-500"><span>VAT (15%)</span><span>৳{parseFloat(order.vat_amount).toFixed(2)}</span></div>}
                  {parseFloat(order.service_charge) > 0 && <div className="flex justify-between text-slate-500"><span>Service (10%)</span><span>৳{parseFloat(order.service_charge).toFixed(2)}</span></div>}
                  <div className="flex justify-between font-black text-slate-800 text-base border-t border-slate-100 pt-2"><span>Total</span><span>৳{parseFloat(order.total_amount).toFixed(2)}</span></div>
                </div>
                {!['done','cancelled'].includes(order.status) && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={handlePrintBill} disabled={printing}
                      className="btn btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                      {printing ? <LoadingSpinner size="sm" /> : <PrinterIcon className="h-4 w-4" />}
                      Print Bill &amp; Complete
                    </button>
                    <button onClick={handleMarkDone} className="btn btn-success flex items-center gap-1.5">
                      <CheckIcon className="h-4 w-4" /> Done
                    </button>
                  </div>
                )}
                {order.status === 'done' && (
                  <div className="text-center py-3 text-emerald-600 font-bold text-sm">Order completed ✓</div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">Order not found</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-sky-950/30 backdrop-blur-sm p-4">
      <div className="relative bg-white flex flex-col lg:flex-row w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-sky-100"
        style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-100">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={onClose} className="btn btn-ghost btn-icon"><ArrowLeftIcon className="h-5 w-5" /></button>
              <div className="flex-1">
                <h2 className="font-black text-slate-800">{reservation.customer_name}</h2>
                <p className="text-xs text-slate-400">
                  Table {reservation.table_number || '—'} · Party of {reservation.party_size} · {reservation.reservation_time?.slice(0,5)}
                </p>
              </div>
              <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-slate-100">
            <button onClick={() => setCategoryFilter('')}
              className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-all ${!categoryFilter ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setCategoryFilter(String(c.id))}
                className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-all ${categoryFilter === String(c.id) ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
            {items.map(item => (
              <button key={item.id} onClick={() => addToCart(item)}
                className="bg-white border border-slate-100 rounded-xl p-3 text-left hover:border-sky-300 hover:shadow-md transition-all active:scale-95">
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
        <div className="w-full lg:w-80 flex flex-col bg-slate-50">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2 bg-white">
            <ShoppingCartIcon className="h-5 w-5 text-sky-500" />
            <h2 className="font-black text-slate-800">Cart ({cart.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center mt-8">
                <ShoppingCartIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No items added yet</p>
              </div>
            ) : cart.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400">৳{c.price.toFixed(0)} each</div>
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
            <textarea className="textarea text-sm h-16" placeholder="Special instructions…"
              value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} />
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-100">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>৳{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>VAT (15%)</span><span>৳{vat.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Service (10%)</span><span>৳{service.toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-slate-800 text-base border-t border-slate-200 pt-2">
                <span>Total</span><span>৳{total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={submitOrder} disabled={submitting || cart.length === 0}
              className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50">
              {submitting ? <LoadingSpinner size="sm" /> : <><CheckIcon className="h-4 w-4" /> Place Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildReceiptHTML(data) {
  const { order, items, restaurant = {} } = data;
  const cur = restaurant.currency || '৳';
  const rname = restaurant.name || 'FoodPark';
  const address = restaurant.address || '';
  const phone = restaurant.phone || '';
  const active = (items || []).filter(i => i.status !== 'cancelled');
  const rows = active.map(i =>
    `<tr><td>${i.item_name||i.name||''}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${cur}${parseFloat(i.total_price).toFixed(2)}</td></tr>`
  ).join('');
  const vatRow = parseFloat(order.vat_amount)>0 ? `<tr><td>VAT</td><td style="text-align:right">${cur}${parseFloat(order.vat_amount).toFixed(2)}</td></tr>` : '';
  const svcRow = parseFloat(order.service_charge)>0 ? `<tr><td>Service</td><td style="text-align:right">${cur}${parseFloat(order.service_charge).toFixed(2)}</td></tr>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>body{font-family:monospace;font-size:12px;padding:12px;max-width:300px;margin:auto}
h2{text-align:center;font-size:16px;margin:4px 0}p{text-align:center;margin:2px 0;color:#555}
table{width:100%;border-collapse:collapse;margin:8px 0}th{border-bottom:1px dashed #000;padding:3px 0;font-size:11px;text-align:left}
td{padding:2px 0}.divider{border-top:1px dashed #000;margin:6px 0}.total{font-weight:bold;font-size:14px}
.footer{text-align:center;margin-top:10px;font-size:10px;color:#777}@media print{body{margin:0}}</style></head><body>
<h2>${rname}</h2>${address?`<p>${address}</p>`:''}${phone?`<p>Tel: ${phone}</p>`:''}
<div class="divider"></div>
<p>Order: <strong>${order.order_number}</strong></p>
<p>${new Date(order.created_at).toLocaleString()}</p>
${order.table_number?`<p>Table: ${order.table_number}</p>`:''}
<div class="divider"></div>
<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="divider"></div>
<table>
<tr><td>Subtotal</td><td style="text-align:right">${cur}${parseFloat(order.subtotal).toFixed(2)}</td></tr>
${vatRow}${svcRow}
<tr class="total"><td>TOTAL</td><td style="text-align:right">${cur}${parseFloat(order.total_amount).toFixed(2)}</td></tr>
</table>
<div class="divider"></div>
<p class="footer">Thank you for dining with us!</p>
</body></html>`;
}
