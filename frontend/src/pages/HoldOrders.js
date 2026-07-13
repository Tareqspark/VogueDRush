import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
  PauseCircleIcon, PrinterIcon, CheckCircleIcon, XMarkIcon,
  ClockIcon, PhoneIcon, UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeaway' };

export default function HoldOrders() {
  const { api } = useAuth();
  const queryClient = useQueryClient();
  const [settlingId, setSettlingId] = useState(null);

  const { data, isLoading } = useQuery(
    'hold-orders',
    () => api.get('/orders/hold').then(r => r.data),
    { refetchInterval: 20000 }
  );

  const orders = data?.orders || [];

  const reactivate = async (id) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: 'pending' });
      toast.success('Order reactivated — moved back to pending');
      queryClient.invalidateQueries('hold-orders');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to reactivate order');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <PauseCircleIcon className="h-6 w-6 text-orange-500" /> Hold Orders
          </h1>
          <p className="text-slate-500 text-sm">{orders.length} order{orders.length !== 1 ? 's' : ''} on hold — payment pending</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <div className="card p-16 text-center">
          <PauseCircleIcon className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No hold orders at the moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id}
              className="card p-5 border-l-4 border-l-orange-400 bg-orange-50/20">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sky-600 text-sm">{order.order_number}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                      {TYPE_LABELS[order.order_type] || order.order_type}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 border border-orange-200 font-semibold">
                      ⏸ Hold
                    </span>
                  </div>
                  {/* One-sentence detail */}
                  <div className="mt-1.5 flex items-center gap-3 text-sm flex-wrap">
                    {order.customer_name && (
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <UserIcon className="h-3.5 w-3.5 text-slate-400" /> {order.customer_name}
                      </span>
                    )}
                    {order.customer_phone && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <PhoneIcon className="h-3.5 w-3.5 text-slate-400" /> {order.customer_phone}
                      </span>
                    )}
                    {order.table_number && (
                      <span className="text-slate-500 font-medium">Table {order.table_number}</span>
                    )}
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <ClockIcon className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-600">৳{parseFloat(order.total_amount).toFixed(0)}</p>
                  <p className="text-xs text-slate-400">Due amount</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setSettlingId(order.id)}
                  className="btn btn-primary flex items-center gap-1.5">
                  <PrinterIcon className="h-4 w-4" /> Settle & Print Bill
                </button>
                <button
                  onClick={() => reactivate(order.id)}
                  className="btn btn-secondary flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4" /> Reactivate Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {settlingId && (
        <SettleModal
          api={api}
          orderId={settlingId}
          onClose={() => setSettlingId(null)}
          onSettled={() => {
            setSettlingId(null);
            queryClient.invalidateQueries('hold-orders');
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Settle Modal — collect payment for a hold order
// ────────────────────────────────────────────────────────────────
function SettleModal({ api, orderId, onClose, onSettled }) {
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentLast4, setPaymentLast4] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data: detailData } = useQuery(
    ['hold-order-detail', orderId],
    () => api.get(`/orders/${orderId}`).then(r => r.data)
  );

  const order = detailData?.order;
  const items = (detailData?.items || []).filter(i => i.status !== 'cancelled');

  const settle = async () => {
    if (['card', 'bkash', 'nagad'].includes(paymentMethod) && !/^\d{4}$/.test(paymentLast4)) {
      return toast.error('Enter last 4 digits for selected payment method');
    }
    setProcessing(true);
    try {
      const res = await api.post(`/orders/${orderId}/bill`, {
        discount_amount: parseFloat(discountAmount) || 0,
        payment_method: paymentMethod,
        payment_last4: ['card', 'bkash', 'nagad'].includes(paymentMethod) ? paymentLast4 : undefined,
      });
      const data = res.data;
      // Build and print receipt
      const html = buildSettledReceiptHTML(data);
      const w = window.open('', '_blank', 'width=380,height=650');
      if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
      toast.success('Order settled! Bill printed.');
      onSettled();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to settle order');
    } finally {
      setProcessing(false);
    }
  };

  if (!order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/30 backdrop-blur-sm">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const discount = parseFloat(discountAmount) || 0;
  const baseTotal = parseFloat(order.subtotal) + parseFloat(order.vat_amount) + parseFloat(order.service_charge);
  const finalTotal = Math.max(0, baseTotal - discount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-950/30 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl border border-sky-100 animate-fade-in"
        style={{ boxShadow: '0 20px 60px rgb(2 132 199 / 0.15)' }}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">Settle Hold Order</h2>
              <p className="text-xs text-slate-400 font-mono">{order.order_number}</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><XMarkIcon className="h-5 w-5" /></button>
          </div>

          {/* Customer summary */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm">
            <p className="font-bold text-orange-800">
              {order.customer_name} · {order.customer_phone}
            </p>
            <p className="text-orange-600 text-xs mt-0.5">
              {items.length} item{items.length !== 1 ? 's' : ''} · Original: ৳{parseFloat(order.total_amount).toFixed(2)}
            </p>
          </div>

          {/* Items */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm max-h-40 overflow-y-auto">
            {items.map(item => (
              <div key={item.id} className="flex justify-between">
                <span className="text-slate-700">{item.item_name} <span className="text-slate-400">× {item.quantity}</span></span>
                <span className="font-bold text-slate-800">৳{parseFloat(item.total_price).toFixed(0)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="label">Discount Amount</label>
              <input className="input" type="number" min="0" step="0.01" value={discountAmount}
                onChange={e => setDiscountAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>
            {['card', 'bkash', 'nagad'].includes(paymentMethod) && (
              <div>
                <label className="label">Last 4 Digits</label>
                <input className="input" maxLength={4} value={paymentLast4}
                  onChange={e => setPaymentLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" />
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-sm border border-slate-100">
            <div className="flex justify-between text-slate-500"><span>Food Price</span><span>৳{parseFloat(order.subtotal).toFixed(2)}</span></div>
            {parseFloat(order.vat_amount) > 0 && <div className="flex justify-between text-slate-500"><span>VAT</span><span>৳{parseFloat(order.vat_amount).toFixed(2)}</span></div>}
            {parseFloat(order.service_charge) > 0 && <div className="flex justify-between text-slate-500"><span>Service Charge</span><span>৳{parseFloat(order.service_charge).toFixed(2)}</span></div>}
            <div className="flex justify-between font-semibold text-slate-700 border-t border-slate-100 pt-2"><span>Total</span><span>৳{baseTotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-৳{discount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-slate-800 text-base border-t border-slate-100 pt-2">
              <span>Total Payable</span><span>৳{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={onClose} disabled={processing}>Cancel</button>
            <button className="btn btn-primary flex-1 justify-center" onClick={settle} disabled={processing}>
              {processing ? <LoadingSpinner size="sm" /> : <><PrinterIcon className="h-4 w-4" />Print & Settle</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildSettledReceiptHTML(data) {
  const { order, items, restaurant = {} } = data;
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
  const discRow = parseFloat(order.discount_amount) > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${currency}${parseFloat(order.discount_amount).toFixed(2)}</td></tr>` : '';
  const grossTotal = (parseFloat(order.subtotal) + parseFloat(order.vat_amount || 0) + parseFloat(order.service_charge || 0)).toFixed(2);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>@page{size:58mm auto;margin:0}
  body{font-family:monospace;font-size:11px;padding:2mm;width:54mm;margin:auto;box-sizing:border-box}
  h2{text-align:center;font-size:13px;margin:4px 0}p{text-align:center;margin:2px 0;color:#555}
  table{width:100%;border-collapse:collapse;margin:8px 0}th{border-bottom:1px dashed #000;padding:3px 0;font-size:10px;text-align:left}
  td{padding:2px 0;word-break:break-word}.divider{border-top:1px dashed #000;margin:6px 0}.total{font-weight:bold;font-size:12px}
  .footer{text-align:center;margin-top:10px;font-size:9px;color:#777}
  .settled{margin-top:10px;padding:6px;border:2px solid #16a34a;text-align:center;color:#16a34a;font-weight:bold}
  @media print{body{margin:0;width:54mm}}</style></head><body>
  <h2>${rname}</h2>${address ? `<p>${address}</p>` : ''}${phone ? `<p>Tel: ${phone}</p>` : ''}
  <div class="divider"></div>
  <p>Order: <strong>${order.order_number}</strong></p>
  <p>${new Date(order.created_at).toLocaleString()}</p>
  ${order.table_number ? `<p>Table: ${order.table_number}</p>` : ''}
  ${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}
  ${order.customer_phone ? `<p>Phone: ${order.customer_phone}</p>` : ''}
  ${order.waiter_full_name || order.waiter_name ? `<p>Served by: ${order.waiter_full_name || order.waiter_name}</p>` : ''}
  <div class="divider"></div>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="divider"></div>
  <table>
  <tr><td>Food Price</td><td style="text-align:right">${currency}${parseFloat(order.subtotal).toFixed(2)}</td></tr>
  ${vatRow}${svcRow}
  <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${currency}${grossTotal}</strong></td></tr>
  ${discRow}
  <tr class="total"><td>Total Payable</td><td style="text-align:right">${currency}${parseFloat(order.total_amount).toFixed(2)}</td></tr></table>
  <div class="divider"></div>
  <div class="settled">✓ PAID — SETTLED</div>
  <p class="footer">Thank you for dining with us!</p>
  </body></html>`;
}
