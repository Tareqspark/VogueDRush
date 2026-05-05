import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon, MagnifyingGlassIcon, XMarkIcon,
  ShoppingCartIcon, TrashIcon, MinusIcon, CheckIcon,
  PencilSquareIcon, PrinterIcon, LockClosedIcon, ArrowLeftIcon,
  PauseCircleIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const STATUS_COLORS = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  ready:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  done:      'bg-slate-100 text-slate-500 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  hold:      'bg-orange-50 text-orange-600 border-orange-200',
};

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeway' };
const TYPE_CARD_STYLES = {
  dine_in: 'border-l-sky-400 bg-sky-50/20',
  delivery: 'border-l-amber-400 bg-amber-50/20',
  direct: 'border-l-emerald-400 bg-emerald-50/20',
};

export default function Orders() {
  const { api, user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [holdingOrder, setHoldingOrder] = useState(null);

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
  const updateStatus = async (id, status, reason) => {
    try {
      await api.patch(`/orders/${id}/status`, { status, reason });
      toast.success(`Order marked as ${status}`);
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries(['order-detail', id]);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || e.response?.data?.error || 'Failed to update');
    }
  };

  const printBill = async (id, payload = {}) => {
    try {
      const res = await api.post(`/orders/${id}/bill`, payload);
      queryClient.invalidateQueries('orders');
      queryClient.invalidateQueries(['order-detail', id]);
      return res.data;
    } catch (e) {
      toast.error(e.response?.data?.error?.message || e.response?.data?.error || 'Failed to print bill');
      return null;
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
          {['pending','preparing','ready','done','cancelled','hold'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-36">
          <option value="">All Types</option>
          <option value="dine_in">Dine In</option>
          <option value="delivery">Delivery</option>
          <option value="direct">Takeway</option>
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
              className={`card p-4 cursor-pointer hover:shadow-card-hover transition-all group border-l-4 ${order.status === 'hold' ? 'border-l-orange-400 bg-orange-50/20' : (TYPE_CARD_STYLES[order.order_type] || 'border-l-slate-200')}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                    {TYPE_LABELS[order.order_type]}
                  </span>
                  {order.table_number && (
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                      Table {order.table_number}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <ClockIcon className="h-3 w-3" />
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
                    {order.status === 'hold' ? '⏸ Hold' : order.status}
                  </span>
                  <span className="font-black text-slate-800 text-base">৳{parseFloat(order.total_amount).toFixed(0)}</span>
                  {order.bill_printed && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-semibold">
                      <LockClosedIcon className="h-3 w-3" /> Printed
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-3">
                <span>by {order.waiter_full_name}</span>
                {order.customer_name && <span className="font-medium text-slate-500">{order.customer_name}{order.customer_phone ? ` · ${order.customer_phone}` : ''}</span>}
              </div>
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
          onPrintBill={printBill}
          onEditOrder={(id) => { setEditingOrder(id); setSelectedOrder(null); }}
          onHoldOrder={(order) => { setHoldingOrder(order); setSelectedOrder(null); }}
          userRole={user.role}
          userId={user.id}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          api={api}
          orderId={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            queryClient.invalidateQueries('orders');
          }}
        />
      )}

      {holdingOrder && (
        <HoldOrderModal
          api={api}
          order={holdingOrder}
          onClose={() => setHoldingOrder(null)}
          onHeld={() => {
            setHoldingOrder(null);
            queryClient.invalidateQueries('orders');
          }}
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
function OrderDetailModal({ detail, onClose, onUpdateStatus, onPrintBill, onEditOrder, onHoldOrder, userRole, userId }) {
  const { order, items } = detail;
  const [printing, setPrinting] = useState(false);
  const [showBillPopup, setShowBillPopup] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLast4, setPaymentLast4] = useState('');

  const activeItems = items.filter(i => i.status !== 'cancelled');
  const canEdit = !order.bill_printed && !['done', 'cancelled', 'hold'].includes(order.status)
    && (userRole === 'admin' || order.waiter_id === userId);
  const canHold = !order.bill_printed && !['done', 'cancelled', 'hold'].includes(order.status)
    && (userRole === 'admin' || order.waiter_id === userId);

  const nextStatus = { pending: 'preparing', preparing: 'ready', ready: 'done' }[order.status];
  const nextLabel  = { pending: 'Preparing', preparing: 'Ready', ready: 'Done' }[order.status];

  // Build one-sentence order summary
  const summaryParts = [];
  if (order.table_number) summaryParts.push(`Table ${order.table_number}`);
  if (order.customer_name) summaryParts.push(order.customer_name);
  if (order.customer_phone) summaryParts.push(order.customer_phone);
  summaryParts.push(`${activeItems.length} item${activeItems.length !== 1 ? 's' : ''}`);
  summaryParts.push(`\u09f3${parseFloat(order.total_amount).toFixed(0)}`);
  const orderSummary = summaryParts.join(' \u00b7 ');

  const handlePrint = async () => {
    if (['card', 'bkash', 'nagad'].includes(paymentMethod) && !/^\d{4}$/.test(paymentLast4)) {
      toast.error('Enter last 4 digits for selected payment method');
      return;
    }

    setPrinting(true);
    const data = await onPrintBill(order.id, {
      discount_amount: parseFloat(discountAmount) || 0,
      payment_method: paymentMethod,
      payment_last4: ['card', 'bkash', 'nagad'].includes(paymentMethod) ? paymentLast4 : undefined,
    });
    setPrinting(false);
    if (data) {
      const html = buildReceiptHTML(data);
      const w = window.open('', '_blank', 'width=380,height=650');
      if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
      setShowBillPopup(false);
      toast.success('Bill printed! Order auto-completed.');
      onClose();
    }
  };

  const handleReprint = () => {
    const data = { order, items: activeItems, restaurant: { name: 'FoodPark', currency: '৳' } };
    const html = buildReceiptHTML(data);
    const w = window.open('', '_blank', 'width=380,height=650');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  const handleMarkDone = async () => {
    if (!order.bill_printed) {
      setShowBillPopup(true);
      return;
    }
    onUpdateStatus(order.id, 'done');
    onClose();
  };

  const requestCancel = async () => {
    const reason = window.prompt('Cancellation reason (required):');
    if (!reason || !reason.trim()) return;
    onUpdateStatus(order.id, 'cancelled', reason.trim());
    onClose();
  };

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

          {/* One-sentence order summary */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-sky-800">
            {orderSummary}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${STATUS_COLORS[order.status] || STATUS_COLORS.pending}`}>
              {order.status === 'hold' ? '⏸ Hold' : order.status}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">{TYPE_LABELS[order.order_type]}</span>
            {order.bill_printed && (
              <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full font-semibold">
                <LockClosedIcon className="h-3 w-3" /> Locked
              </span>
            )}
          </div>

          {/* Items */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            {activeItems.map(item => (
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

          <div className="flex flex-wrap gap-2 pt-1">
            {canEdit && (
              <button onClick={() => onEditOrder(order.id)}
                className="btn btn-secondary flex items-center gap-1.5">
                <PencilSquareIcon className="h-4 w-4" /> Edit Items
              </button>
            )}

            {canHold && (
              <button onClick={() => onHoldOrder(order)}
                className="btn btn-secondary flex items-center gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50">
                <PauseCircleIcon className="h-4 w-4" /> Hold Order
              </button>
            )}

            {!order.bill_printed && order.status !== 'cancelled' && (userRole === 'admin' || order.waiter_id === userId) && (
              <button onClick={() => setShowBillPopup(true)} disabled={printing}
                className="btn btn-primary flex items-center gap-1.5 disabled:opacity-50">
                {printing ? <LoadingSpinner size="sm" /> : <PrinterIcon className="h-4 w-4" />}
                Print Bill
              </button>
            )}

            {order.bill_printed && (
              <button onClick={handleReprint} className="btn btn-secondary flex items-center gap-1.5">
                <PrinterIcon className="h-4 w-4" /> Re-print
              </button>
            )}

            {!['done','cancelled'].includes(order.status) && nextStatus && (
              <button onClick={() => {
                if (nextStatus === 'done') {
                  handleMarkDone();
                } else {
                  onUpdateStatus(order.id, nextStatus);
                  onClose();
                }
              }}
                className="btn btn-primary flex-1">
                Mark as {nextLabel}
              </button>
            )}

            {userRole === 'admin' && !['done','cancelled'].includes(order.status) && !order.bill_printed && (
              <button onClick={requestCancel} className="btn btn-error px-4">
                Cancel
              </button>
            )}
          </div>

          {order.cancellation_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
              <span className="font-bold">Cancel Reason: </span>{order.cancellation_reason}
            </div>
          )}

          {showBillPopup && (
            <div className="mt-2 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-bold text-slate-700 text-sm">Finalize Bill</h3>
              <div>
                <label className="label">Discount Amount</label>
                <input className="input" type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                </select>
              </div>
              {['card', 'bkash', 'nagad'].includes(paymentMethod) && (
                <div>
                  <label className="label">Last 4 Digits</label>
                  <input className="input" maxLength={4} value={paymentLast4} onChange={(e) => setPaymentLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" />
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn btn-secondary flex-1" onClick={() => setShowBillPopup(false)}>Close</button>
                <button className="btn btn-primary flex-1" onClick={handlePrint} disabled={printing}>
                  {printing ? <LoadingSpinner size="sm" /> : 'Print & Complete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Build receipt HTML for window.print()
// ────────────────────────────────────────────────────────────────
function buildReceiptHTML(data) {
  const { order, items, restaurant = {}, isDue = false } = data;
  const currency = restaurant.currency || '৳';
  const rname = restaurant.name || 'FoodPark';
  const address = restaurant.address || '';
  const phone = restaurant.phone || '';
  const activeItems = (items || []).filter(i => i.status !== 'cancelled');
  const rows = activeItems.map(i =>
    `<tr><td>${i.item_name || i.name || ''}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${currency}${parseFloat(i.total_price).toFixed(2)}</td></tr>`
  ).join('');
  const vatRow = parseFloat(order.vat_amount) > 0 ? `<tr><td>VAT</td><td style="text-align:right">${currency}${parseFloat(order.vat_amount).toFixed(2)}</td></tr>` : '';
  const svcRow = parseFloat(order.service_charge) > 0 ? `<tr><td>Service Charge</td><td style="text-align:right">${currency}${parseFloat(order.service_charge).toFixed(2)}</td></tr>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>body{font-family:monospace;font-size:12px;padding:12px;max-width:300px;margin:auto}
  h2{text-align:center;font-size:16px;margin:4px 0}p{text-align:center;margin:2px 0;color:#555}
  table{width:100%;border-collapse:collapse;margin:8px 0}th{border-bottom:1px dashed #000;padding:3px 0;font-size:11px;text-align:left}
  td{padding:2px 0}.divider{border-top:1px dashed #000;margin:6px 0}.total{font-weight:bold;font-size:14px}
  .footer{text-align:center;margin-top:10px;font-size:10px;color:#777}@media print{body{margin:0}}</style></head><body>
  <h2>${rname}</h2>${address ? `<p>${address}</p>` : ''}${phone ? `<p>Tel: ${phone}</p>` : ''}
  <div class="divider"></div>
  <p>Order: <strong>${order.order_number}</strong></p>
  <p>${new Date(order.created_at).toLocaleString()}</p>
  ${order.table_number ? `<p>Table: ${order.table_number}</p>` : ''}
  ${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}
  <div class="divider"></div>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="divider"></div>
  <table><tr><td>Subtotal</td><td style="text-align:right">${currency}${parseFloat(order.subtotal).toFixed(2)}</td></tr>
  ${vatRow}${svcRow}
  <tr class="total"><td>TOTAL</td><td style="text-align:right">${currency}${parseFloat(order.total_amount).toFixed(2)}</td></tr></table>
  <div class="divider"></div>
  <p class="footer">Thank you for dining with us!</p><p class="footer">Please come again</p>
  ${isDue ? '<div style="margin-top:12px;padding:8px;border:2px dashed #dc2626;text-align:center;"><strong style="font-size:14px;color:#dc2626;">⚠ DUE — PAYMENT PENDING</strong><br/><span style="font-size:11px;color:#555;">Customer: ' + (order.customer_name || '') + '</span><br/><span style="font-size:11px;color:#555;">Phone: ' + (order.customer_phone || '') + '</span></div>' : ''}
  </body></html>`;
}

// ────────────────────────────────────────────────────────────────
// Edit Order Modal — add/remove items from an existing order
// ────────────────────────────────────────────────────────────────
function EditOrderModal({ api, orderId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [itemQties, setItemQties] = useState({}); // {order_item_id: new_quantity}
  const [toAdd, setToAdd] = useState([]);

  const { data: orderDetail, isLoading: loadingOrder } = useQuery(
    ['order-detail-edit', orderId],
    () => api.get(`/orders/${orderId}`).then(r => r.data)
  );
  const { data: categoriesData } = useQuery('categories', () => api.get('/menu/categories').then(r => r.data));
  const { data: itemsData } = useQuery(['menu-items-edit', categoryFilter, search],
    () => api.get('/menu/items', { params: { is_available: true, category_id: categoryFilter || undefined, search: search || undefined } }).then(r => r.data)
  );

  if (loadingOrder) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 backdrop-blur-sm">
      <LoadingSpinner size="lg" />
    </div>
  );

  const { order, items = [] } = orderDetail || {};
  const currentActiveItems = items.filter(i => i.status !== 'cancelled');
  const categories = categoriesData || [];
  const menuItems = itemsData?.items || [];

  const getQty = (item) => itemQties[item.id] !== undefined ? itemQties[item.id] : item.quantity;
  const setQty = (item, val) => setItemQties(prev => ({ ...prev, [item.id]: Math.max(0, val) }));
  const changeItemQty = (item, delta) => setQty(item, getQty(item) + delta);

  const addToCart = (item) => setToAdd(prev => {
    const ex = prev.find(c => c.food_item_id === item.id);
    if (ex) return prev.map(c => c.food_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
    return [...prev, { food_item_id: item.id, quantity: 1, name: item.name, price: item.promotional_price || item.price }];
  });

  const changeAddQty = (id, delta) =>
    setToAdd(prev => prev.map(c => c.food_item_id === id ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));

  const removeFromAdd = (id) => setToAdd(prev => prev.filter(c => c.food_item_id !== id));

  const save = async () => {
    const update_items = currentActiveItems
      .filter(i => itemQties[i.id] !== undefined && itemQties[i.id] > 0 && itemQties[i.id] !== i.quantity)
      .map(i => ({ order_item_id: i.id, quantity: itemQties[i.id] }));
    const remove_item_ids = currentActiveItems
      .filter(i => itemQties[i.id] === 0)
      .map(i => i.id);
    if (update_items.length === 0 && remove_item_ids.length === 0 && toAdd.length === 0) {
      return toast.error('No changes made');
    }
    setSaving(true);
    try {
      await api.put(`/orders/${orderId}/items`, {
        add_items: toAdd.map(({ food_item_id, quantity }) => ({ food_item_id, quantity })),
        remove_item_ids,
        update_items,
      });
      toast.success('Order updated successfully');
      queryClient.invalidateQueries(['order-detail', orderId]);
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const remaining = currentActiveItems.filter(i => itemQties[i.id] !== 0).reduce((s, i) => {
    const qty = itemQties[i.id] !== undefined ? itemQties[i.id] : i.quantity;
    const unitPrice = parseFloat(i.total_price) / i.quantity;
    return s + unitPrice * qty;
  }, 0);
  const addSub = toAdd.reduce((s, i) => s + i.price * i.quantity, 0);
  const previewSub = remaining + addSub;
  const svcRate = order?.order_type === 'dine_in' ? 0.10 : 0;
  const previewTotal = previewSub * (1 + 0.15 + svcRate);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-sky-950/30 backdrop-blur-sm">
      <div className="relative bg-white flex flex-col lg:flex-row w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden border border-sky-100"
        style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>

        {/* Left: order items + menu */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-800">Edit Order</h2>
              <p className="text-xs text-slate-400 font-mono">{order?.order_number}</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {/* Current items */}
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Items</p>
              <p className="text-xs text-slate-400 mb-3">Change qty or remove items before food is ready</p>
              <div className="space-y-2">
                {currentActiveItems.map(item => {
                  const qty = getQty(item);
                  const isRemoving = qty === 0;
                  return (
                    <div key={item.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isRemoving ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-100'}`}>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${isRemoving ? 'line-through text-rose-400' : 'text-slate-700'}`}>
                          {item.item_name}
                        </span>
                        <div className="text-xs text-slate-400">৳{parseFloat(item.unit_price).toFixed(0)} × {qty} = ৳{(parseFloat(item.unit_price) * qty).toFixed(0)}</div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => changeItemQty(item, -1)}
                          className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-rose-100 transition-colors">
                          <MinusIcon className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                        <span className={`w-7 text-center text-sm font-black ${isRemoving ? 'text-rose-500' : 'text-slate-800'}`}>{qty}</span>
                        <button onClick={() => changeItemQty(item, 1)}
                          className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                          <PlusIcon className="h-3.5 w-3.5 text-slate-600" />
                        </button>
                        <button onClick={() => setQty(item, 0)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-50 ml-1">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Add items */}
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add Items</p>
              <div className="relative mb-2">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input className="input pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setCategoryFilter('')}
                  className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${!categoryFilter ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>All</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategoryFilter(String(c.id))}
                    className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${categoryFilter === String(c.id) ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {menuItems.map(item => (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="bg-white border border-slate-100 rounded-xl p-3 text-left hover:border-sky-300 hover:shadow-card-hover transition-all active:scale-95">
                  <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                  <div className="text-xs text-slate-400 truncate">{item.category_name}</div>
                  <div className="mt-1 text-sky-600 font-black text-sm">৳{parseFloat(item.promotional_price || item.price).toFixed(0)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Changes summary */}
        <div className="w-full lg:w-80 flex flex-col bg-slate-50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-black text-slate-800">Changes</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {(() => {
              const removing = currentActiveItems.filter(i => itemQties[i.id] === 0);
              const updating = currentActiveItems.filter(i => itemQties[i.id] !== undefined && itemQties[i.id] > 0 && itemQties[i.id] !== i.quantity);
              const hasChanges = removing.length > 0 || updating.length > 0 || toAdd.length > 0;
              return (<>
                {removing.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Removing</p>
                    <div className="space-y-2">
                      {removing.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-sm">
                          <span className="text-rose-700 font-medium line-through">{item.item_name}</span>
                          <button onClick={() => setQty(item, item.quantity)} className="text-rose-400 hover:text-rose-600">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {updating.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Qty Changed</p>
                    <div className="space-y-2">
                      {updating.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-sm">
                          <span className="text-amber-800 font-medium">{item.item_name}</span>
                          <span className="text-amber-700 font-bold">{item.quantity} → {itemQties[item.id]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {toAdd.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Adding</p>
                    <div className="space-y-2">
                      {toAdd.map(item => (
                        <div key={item.food_item_id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-bold text-emerald-800 truncate">{item.name}</span>
                            <button onClick={() => removeFromAdd(item.food_item_id)} className="text-emerald-400 hover:text-emerald-600">
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => changeAddQty(item.food_item_id, -1)} className="h-6 w-6 rounded-lg bg-white border border-emerald-200 flex items-center justify-center">
                              <MinusIcon className="h-3 w-3 text-slate-600" />
                            </button>
                            <span className="w-6 text-center text-sm font-black">{item.quantity}</span>
                            <button onClick={() => changeAddQty(item.food_item_id, 1)} className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <PlusIcon className="h-3 w-3 text-emerald-700" />
                            </button>
                            <span className="text-xs text-slate-500 ml-auto">৳{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!hasChanges && (
                  <div className="text-center mt-8">
                    <PencilSquareIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Use +/- to change qty, trash to remove, or add new items from the menu</p>
                  </div>
                )}
              </>);
            })()}
          </div>
          <div className="p-4 border-t border-slate-200 space-y-3 bg-white">
            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-100">
              <div className="flex justify-between text-slate-500 text-xs"><span>New Subtotal</span><span>৳{previewSub.toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-slate-800 border-t border-slate-200 pt-2"><span>Est. Total</span><span>৳{previewTotal.toFixed(2)}</span></div>
            </div>
            <button onClick={save} disabled={saving || (Object.keys(itemQties).length === 0 && toAdd.length === 0)}
              className="btn btn-primary w-full disabled:opacity-50 justify-center">
              {saving ? <LoadingSpinner size="sm" /> : <><CheckIcon className="h-4 w-4" />Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Hold Order Modal
// ────────────────────────────────────────────────────────────────
function HoldOrderModal({ api, order, onClose, onHeld }) {
  const [customerName, setCustomerName] = useState(order.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || '');
  const [saving, setSaving] = useState(false);
  const [printDue, setPrintDue] = useState(true);

  const holdAmount = parseFloat(order.total_amount).toFixed(2);

  const handleHold = async () => {
    if (!customerName.trim()) return toast.error('Customer name is required');
    if (!customerPhone.trim()) return toast.error('Customer phone is required');
    setSaving(true);
    try {
      const res = await api.patch(`/orders/${order.id}/hold`, {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
      });
      toast.success('Order held. Table released.');
      if (printDue) {
        // Print DUE slip
        const heldOrder = res.data.order || { ...order, customer_name: customerName, customer_phone: customerPhone };
        const html = buildReceiptHTML({
          order: heldOrder,
          items: [],  // no item lines on DUE slip — caller should pass items if needed
          isDue: true,
        });
        const w = window.open('', '_blank', 'width=380,height=500');
        if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
      }
      onHeld();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to hold order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-orange-100 animate-fade-in"
        style={{ boxShadow: '0 20px 60px rgb(234 88 12 / 0.15)' }}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">Hold Order</h2>
              <p className="text-xs text-slate-400">Customer will pay later · Table will be released</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
          </div>

          {/* Amount preview */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Due Amount</p>
            <p className="text-3xl font-black text-orange-700">৳{holdAmount}</p>
            <p className="text-xs text-orange-500 mt-1">{order.order_number}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Customer Name <span className="text-rose-500">*</span></label>
              <input className="input" placeholder="Enter customer name" value={customerName}
                onChange={e => setCustomerName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Phone Number <span className="text-rose-500">*</span></label>
              <input className="input" placeholder="01XXXXXXXXX" value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={printDue} onChange={e => setPrintDue(e.target.checked)}
                className="h-4 w-4 rounded" />
              <span className="text-sm text-slate-600">Print DUE slip</span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button className="btn btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn flex-1 bg-orange-500 text-white hover:bg-orange-600 justify-center"
              onClick={handleHold} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : <><PauseCircleIcon className="h-4 w-4" />Confirm Hold</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// New Order Modal (POS)
// ────────────────────────────────────────────────────────────────
function NewOrderModal({ api, userId, onClose, onCreated }) {
  const [step, setStep] = useState('type'); // 'type' | 'table' | 'menu'
  const [orderType, setOrderType] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [orderTime, setOrderTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [deliveryTime, setDeliveryTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cart, setCart] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: tablesData } = useQuery('all-tables', () =>
    api.get('/tables').then(r => r.data)
  );
  const { data: categoriesData } = useQuery('categories', () =>
    api.get('/menu/categories').then(r => r.data)
  );
  const { data: itemsData } = useQuery(
    ['menu-items', categoryFilter, search],
    () => api.get('/menu/items', { params: { is_available: true, category_id: categoryFilter || undefined, search: search || undefined } }).then(r => r.data),
    { enabled: step === 'menu' }
  );

  const tables = tablesData?.tables || [];
  const categories = categoriesData || [];
  const items = itemsData?.items || [];

  // Group tables by location in display order
  const locationOrder = ['Big House', 'Small House', 'AC Chad', 'AC Room', 'RB Garden', 'Garden', 'Lake Side'];
  const tablesByLocation = tables.reduce((acc, t) => {
    const loc = t.location || 'Other';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(t);
    return acc;
  }, {});
  const sortedLocations = [
    ...locationOrder.filter(l => tablesByLocation[l]),
    ...Object.keys(tablesByLocation).filter(l => !locationOrder.includes(l)),
  ];

  const selectType = (type) => {
    setOrderType(type);
    if (type === 'dine_in') setStep('table');
    else setStep('menu');
  };

  const handleSelectTable = (table) => {
    if (table.status !== 'available') return;
    setSelectedTable(table);
    setStep('menu');
  };

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
    if ((orderType === 'delivery' || orderType === 'direct') && (!customerName || !customerPhone)) {
      return toast.error('Customer name and phone are required');
    }
    if (orderType === 'delivery' && (!address || !orderTime || !deliveryTime)) {
      return toast.error('Delivery requires address, order time and delivery time');
    }
    setSubmitting(true);
    try {
      const payload = {
        order_type: orderType,
        table_id: orderType === 'dine_in' ? selectedTable.id : undefined,
        customer_name: (orderType === 'delivery' || orderType === 'direct') ? customerName : undefined,
        customer_phone: (orderType === 'delivery' || orderType === 'direct') ? customerPhone : undefined,
        special_instructions: specialInstructions || undefined,
        items: cart.map(c => ({ food_item_id: c.id, quantity: c.qty })),
        delivery_details: orderType === 'delivery' ? {
          customer_address: address,
          delivery_phone: customerPhone,
          order_time: orderTime,
          delivery_time: deliveryTime,
        } : undefined,
      };
      await api.post('/orders', payload);
      toast.success('Order created!');
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || e.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // ── STEP: TYPE SELECTION ──────────────────────────────────────────
  if (step === 'type') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-sm animate-fade-in"
          style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-slate-800 text-lg">New Order</h2>
              <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-slate-400 mb-5">Choose order type to get started</p>
            <div className="space-y-3">
              <button onClick={() => selectType('dine_in')}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-sky-400 hover:bg-sky-50 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍽️</span>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 group-hover:text-sky-700">Dine In</div>
                    <div className="text-xs text-slate-400">Select a table from the floor map</div>
                  </div>
                  <span className="text-slate-300 group-hover:text-sky-400 text-lg">→</span>
                </div>
              </button>
              <button onClick={() => selectType('direct')}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 group-hover:text-emerald-700">Takeway</div>
                    <div className="text-xs text-slate-400">Counter / takeaway order</div>
                  </div>
                  <span className="text-slate-300 group-hover:text-emerald-400 text-lg">→</span>
                </div>
              </button>
              <button onClick={() => selectType('delivery')}
                className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-violet-400 hover:bg-violet-50 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛵</span>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 group-hover:text-violet-700">Delivery</div>
                    <div className="text-xs text-slate-400">Home delivery with customer details</div>
                  </div>
                  <span className="text-slate-300 group-hover:text-violet-400 text-lg">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: TABLE PICKER ────────────────────────────────────────────
  if (step === 'table') {
    const availableCount = tables.filter(t => t.status === 'available').length;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col animate-fade-in"
          style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <button onClick={() => setStep('type')} className="btn btn-ghost btn-icon">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h2 className="font-black text-slate-800">Select a Table</h2>
              <p className="text-xs text-slate-400">{availableCount} of {tables.length} tables available</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
          </div>

          {/* Table grid by location */}
          <div className="flex-1 overflow-y-auto p-5 space-y-7">
            {sortedLocations.map(location => (
              <div key={location}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-1 h-px bg-slate-100"></span>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{location}</span>
                  <span className="flex-1 h-px bg-slate-100"></span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
                  {tablesByLocation[location].map(table => {
                    const isAvailable = table.status === 'available';
                    const isOccupied = table.status === 'occupied';
                    return (
                      <button
                        key={table.id}
                        onClick={() => handleSelectTable(table)}
                        disabled={!isAvailable}
                        title={`Table ${table.table_number} · ${table.status}`}
                        className={`relative rounded-xl py-3 px-1 border-2 flex flex-col items-center gap-0.5 transition-all
                          ${ isAvailable
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500 hover:scale-105 active:scale-95 cursor-pointer shadow-sm'
                              : isOccupied
                                ? 'bg-rose-50 border-rose-200 text-rose-400 cursor-not-allowed opacity-60'
                                : 'bg-amber-50 border-amber-200 text-amber-500 cursor-not-allowed opacity-60'
                          }`}
                      >
                        <span className="font-black text-sm leading-none">{table.table_number}</span>
                        <span className="text-[9px] font-semibold capitalize leading-none mt-1 opacity-70">{table.status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-400"></span>Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-400"></span>Occupied
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400"></span>Reserved
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: MENU + CART ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-sky-950/30 backdrop-blur-sm">
      <div className="relative bg-white flex flex-col lg:flex-row w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden border border-sky-100 animate-fade-in"
        style={{ boxShadow: '0 24px 80px rgb(2 132 199 / 0.18)' }}>
        {/* Left: Menu */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-slate-100">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => orderType === 'dine_in' ? setStep('table') : setStep('type')}
                className="btn btn-ghost btn-icon">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <h2 className="font-black text-slate-800">
                  {orderType === 'dine_in' ? `Table ${selectedTable?.table_number}` : TYPE_LABELS[orderType]}
                </h2>
                {orderType === 'dine_in' && selectedTable && (
                  <p className="text-xs text-slate-400">{selectedTable.location}</p>
                )}
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {(orderType === 'delivery' || orderType === 'direct') && (
              <div className="space-y-2 mb-3">
                <input className="input" placeholder="Customer Name *" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input className="input" placeholder="Phone *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                {orderType === 'delivery' && (
                  <>
                    <input className="input" placeholder="Delivery Address *" value={address} onChange={e => setAddress(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input" type="time" value={orderTime} onChange={e => setOrderTime(e.target.value)} />
                      <input className="input" type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input className="input pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {/* Categories */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-slate-100">
            <button onClick={() => setCategoryFilter('')}
              className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-all ${!categoryFilter ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>All</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setCategoryFilter(String(c.id))}
                className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-all ${categoryFilter === String(c.id) ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:text-sky-600'}`}>
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
