// Shared receipt formatting — one data layer, two renderers (browser HTML print, Sunmi native print).
import toast from 'react-hot-toast';

const RECEIPT_CSS = `@page{size:58mm auto;margin:0}
body{font-family:monospace;font-size:11px;padding:2mm;width:54mm;margin:auto;box-sizing:border-box}
h2{text-align:center;font-size:13px;margin:4px 0}p{text-align:center;margin:2px 0;color:#555}
table{width:100%;border-collapse:collapse;margin:8px 0}th{border-bottom:1px dashed #000;padding:3px 0;font-size:10px;text-align:left}
td{padding:2px 0;word-break:break-word}.divider{border-top:1px dashed #000;margin:6px 0}.total{font-weight:bold;font-size:12px}
.footer{text-align:center;margin-top:10px;font-size:9px;color:#777}
.banner{margin-top:10px;padding:6px;border:2px dashed;text-align:center;font-weight:bold}
/* Fixed layout with explicit column widths. Without this the browser auto-sizes
   from content, long item names starve the last column, and "Amount" wraps onto
   a second line on a 54mm roll. nowrap keeps headers and money on one line. */
table.items,table.totals{table-layout:fixed}
.items td:nth-child(1),.items th:nth-child(1){width:50%}
.items td:nth-child(2),.items th:nth-child(2){width:16%;text-align:center;white-space:nowrap}
.items td:nth-child(3),.items th:nth-child(3){width:34%;text-align:right;white-space:nowrap}
.totals td:nth-child(1){width:58%}
.totals td:nth-child(2){width:42%;text-align:right;white-space:nowrap}
/* Identifies which copy this is — BILL vs KITCHEN COPY. */
.doclabel{text-align:center;font-weight:bold;font-size:14px;letter-spacing:3px;
  border:2px solid #000;padding:3px 0;margin:6px 0}
.kitchen-item{font-size:14px;font-weight:bold;padding:4px 0;border-bottom:1px dotted #999}
.kitchen-qty{font-size:16px;font-weight:bold;text-align:right;white-space:nowrap}
@media print{body{margin:0;width:54mm}}`;

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const activeItems = (items) => (items || []).filter(i => i.status !== 'cancelled');

// Normalizes order/items/restaurant into one plain object consumed by both renderers below.
const PAYMENT_LABELS = { cash: 'Cash', bkash: 'bKash', nagad: 'Nagad', card: 'Card' };

export function buildReceiptData({ type, order, items = [], restaurant = {}, payment = null }) {
  const currency = restaurant.currency || '৳';
  const rows = activeItems(items).map(i => ({
    name: i.item_name || i.name || '',
    qty: i.quantity,
    amount: fmt(i.total_price),
  }));
  const subtotal = parseFloat(order.subtotal) || 0;
  const vatAmount = parseFloat(order.vat_amount) || 0;
  const serviceCharge = parseFloat(order.service_charge) || 0;
  const discountAmount = parseFloat(order.discount_amount) || 0;

  return {
    type,
    currency,
    restaurantName: restaurant.name || 'FoodPark',
    address: restaurant.address || '',
    phone: restaurant.phone || '',
    vatNumber: restaurant.vat_number || '',
    orderNumber: order.order_number,
    createdAt: order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString(),
    tableNumber: order.table_number || '',
    customerName: order.customer_name || '',
    customerPhone: order.customer_phone || '',
    servedBy: order.waiter_full_name || order.waiter_name || '',
    rows,
    subtotal: fmt(subtotal),
    vatAmount: vatAmount > 0 ? fmt(vatAmount) : null,
    serviceCharge: serviceCharge > 0 ? fmt(serviceCharge) : null,
    discountAmount: discountAmount > 0 ? fmt(discountAmount) : null,
    grossTotal: fmt(subtotal + vatAmount + serviceCharge),
    totalPayable: fmt(order.total_amount),
    orderType: order.order_type,
    cancellationReason: order.cancellation_reason || '',
    // Fresh prints get `payment` from the bill endpoint; re-prints fall back to the
    // payment joined onto the order record.
    paymentMode: (() => {
      const m = payment?.payment_method || order.payment_method;
      if (!m) return null;
      const last4 = payment?.payment_last4
        || (order.transaction_id ? String(order.transaction_id).split('-')[1] : null);
      return (PAYMENT_LABELS[m] || m) + (last4 ? ` ****${last4}` : '');
    })(),
    printedAt: new Date().toLocaleString(),
  };
}

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeaway' };

// Printed prominently so staff can tell copies apart at a glance.
const DOC_LABELS = { bill: 'BILL', due: 'BILL — DUE', settled: 'BILL — PAID', kitchen: 'KITCHEN COPY' };

// Kitchen copy: what to cook and how many. Deliberately no prices, no totals —
// larger type so it reads on a pass rail.
function toKitchenHtml(d) {
  const rowsHtml = d.rows.map(r =>
    `<tr><td class="kitchen-item">${r.name}</td><td class="kitchen-item kitchen-qty">x${r.qty}</td></tr>`
  ).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kitchen Copy — ${d.orderNumber}</title>
  <style>${RECEIPT_CSS}</style></head><body>
  <div class="doclabel">KITCHEN COPY</div>
  <p style="text-align:center;font-size:13px;font-weight:bold;margin:4px 0">Order ${d.orderNumber}</p>
  <div class="divider"></div>
  <p style="text-align:left;margin:2px 0">Type: <strong>${TYPE_LABELS[d.orderType] || d.orderType || '—'}</strong></p>
  ${d.tableNumber ? `<p style="text-align:left;margin:2px 0">Table: <strong>${d.tableNumber}</strong></p>` : ''}
  ${d.servedBy ? `<p style="text-align:left;margin:2px 0">Waiter: ${d.servedBy}</p>` : ''}
  <p style="text-align:left;margin:2px 0">${d.createdAt}</p>
  <div class="divider"></div>
  <table class="totals"><tbody>${rowsHtml}</tbody></table>
  <div class="divider"></div>
  <p class="footer">Printed ${d.printedAt}</p>
  </body></html>`;
}

function toHtml(d) {
  if (d.type === 'cancelled') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cancellation Receipt — ${d.orderNumber}</title>
    <style>${RECEIPT_CSS}
    .cancelled-banner{background:#000;color:#fff;text-align:center;padding:4px;font-weight:bold;font-size:13px;margin:8px 0;letter-spacing:2px}
    .reason-box{border:2px solid #000;padding:8px;margin-top:10px}
    .reason-label{font-weight:bold;font-size:11px;margin-bottom:4px}
    .row{display:flex;justify-content:space-between;margin:2px 0}</style></head><body>
    <h2 style="font-size:15px">CANCELLATION RECEIPT</h2><p>Order ${d.orderNumber}</p>
    <div class="divider"></div>
    <div class="row"><span>Date</span><span>${d.createdAt}</span></div>
    <div class="row"><span>Type</span><span>${TYPE_LABELS[d.orderType] || d.orderType}</span></div>
    ${d.tableNumber ? `<div class="row"><span>Table</span><span>${d.tableNumber}</span></div>` : ''}
    ${d.customerName ? `<div class="row"><span>Customer</span><span>${d.customerName}</span></div>` : ''}
    ${d.customerPhone ? `<div class="row"><span>Phone</span><span>${d.customerPhone}</span></div>` : ''}
    <div class="row"><span>Staff</span><span>${d.servedBy || '—'}</span></div>
    <div class="divider"></div>
    <div class="row" style="font-weight:bold"><span>Order Value</span><span>${d.currency}${d.totalPayable}</span></div>
    <div class="cancelled-banner">★ CANCELLED ★</div>
    ${d.cancellationReason ? `<div class="reason-box"><div class="reason-label">Cancellation Reason:</div><div>${d.cancellationReason}</div></div>` : ''}
    <div class="divider" style="margin-top:16px"></div>
    <p class="footer">Printed: ${d.printedAt}</p>
    </body></html>`;
  }

  const rowsHtml = d.rows.map(r =>
    `<tr><td>${r.name}</td><td>${r.qty}</td><td>${d.currency}${r.amount}</td></tr>`
  ).join('');
  const vatRow = d.vatAmount ? `<tr><td>VAT</td><td>${d.currency}${d.vatAmount}</td></tr>` : '';
  const svcRow = d.serviceCharge ? `<tr><td>Service Charge</td><td>${d.currency}${d.serviceCharge}</td></tr>` : '';
  const discRow = d.discountAmount ? `<tr><td>Discount</td><td style="color:#dc2626">-${d.currency}${d.discountAmount}</td></tr>` : '';

  let banner = '';
  if (d.type === 'due') {
    banner = `<div class="banner" style="border-color:#dc2626;color:#dc2626">⚠ DUE — PAYMENT PENDING<br/><span style="font-size:11px;color:#555;font-weight:normal">Customer: ${d.customerName}</span><br/><span style="font-size:11px;color:#555;font-weight:normal">Phone: ${d.customerPhone}</span></div>`;
  } else if (d.type === 'settled') {
    banner = `<div class="banner" style="border-color:#16a34a;color:#16a34a">✓ PAID — SETTLED</div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>${RECEIPT_CSS}</style></head><body>
  <h2>${d.restaurantName}</h2>${d.address ? `<p>${d.address}</p>` : ''}${d.phone ? `<p>Tel: ${d.phone}</p>` : ''}${d.vatNumber ? `<p>VAT Reg: ${d.vatNumber}</p>` : ''}
  <div class="divider"></div>
  <p>Order: <strong>${d.orderNumber}</strong></p>
  <p>${d.createdAt}</p>
  ${d.tableNumber ? `<p>Table: ${d.tableNumber}</p>` : ''}
  ${d.customerName ? `<p>Customer: ${d.customerName}</p>` : ''}
  ${d.servedBy ? `<p>Served by: ${d.servedBy}</p>` : ''}
  <div class="doclabel">${DOC_LABELS[d.type] || 'BILL'}</div>
  <div class="divider"></div>
  <table class="items"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody></table>
  <div class="divider"></div>
  <table class="totals"><tr><td>Food Price</td><td>${d.currency}${d.subtotal}</td></tr>
  ${vatRow}${svcRow}
  <tr><td><strong>Total</strong></td><td><strong>${d.currency}${d.grossTotal}</strong></td></tr>
  ${discRow}
  <tr class="total"><td>Total Payable</td><td>${d.currency}${d.totalPayable}</td></tr></table>
  ${d.paymentMode ? `<div class="divider"></div>
  <table class="totals"><tr><td><strong>Payment Mode</strong></td><td><strong>${d.paymentMode}</strong></td></tr></table>` : ''}
  <div class="divider"></div>
  ${banner}
  <p class="footer">Thank you for dining with us!</p><p class="footer">Please come again</p>
  </body></html>`;
}

// Column weights for thermal rows. The Sunmi 58mm head fits 32 characters, but a
// right-aligned column ending exactly at 32 loses its last character to a wrap, so
// every row totals 30 and leaves two columns of margin.
const ITEM_COLS = [15, 4, 11];   // Item / Qty / Amount
const SUM_COLS  = [18, 12];      // label / value
const KITCHEN_COLS = [22, 8];    // item / xQty — narrower first column pulls "x" left

// Printer-agnostic instruction list — consumed by the Sunmi bridge interpreter (align: 0=left,1=center,2=right).
function toSpec(d) {
  const spec = [
    { type: 'text', text: d.restaurantName, align: 1, bold: true },
  ];

  // Kitchen copy: item + qty only, no money.
  if (d.type === 'kitchen') {
    spec.push({ type: 'text', text: 'KITCHEN COPY', align: 1, bold: true });
    spec.push({ type: 'text', text: `Order ${d.orderNumber}`, align: 1, bold: true });
    spec.push({ type: 'divider' });
    spec.push({ type: 'text', text: `Type: ${TYPE_LABELS[d.orderType] || d.orderType || '-'}`, align: 0 });
    if (d.tableNumber) spec.push({ type: 'text', text: `Table: ${d.tableNumber}`, align: 0, bold: true });
    if (d.servedBy) spec.push({ type: 'text', text: `Waiter: ${d.servedBy}`, align: 0 });
    spec.push({ type: 'text', text: d.createdAt, align: 0 });
    spec.push({ type: 'divider' });
    d.rows.forEach(r => spec.push({
      type: 'row',
      cols: [r.name, `x${r.qty}`],
      widths: KITCHEN_COLS,
      align: [0, 2],
      bold: true,
    }));
    spec.push({ type: 'divider' });
    spec.push({ type: 'text', text: `Printed: ${d.printedAt}`, align: 1 });
    spec.push({ type: 'feed', lines: 4 });
    return spec;
  }

  if (d.type === 'cancelled') {
    spec.push({ type: 'text', text: 'CANCELLATION RECEIPT', align: 1, bold: true });
    spec.push({ type: 'text', text: `Order ${d.orderNumber}`, align: 1 });
    spec.push({ type: 'divider' });
    spec.push({ type: 'text', text: `Date: ${d.createdAt}`, align: 0 });
    spec.push({ type: 'text', text: `Type: ${TYPE_LABELS[d.orderType] || d.orderType}`, align: 0 });
    if (d.tableNumber) spec.push({ type: 'text', text: `Table: ${d.tableNumber}`, align: 0 });
    if (d.customerName) spec.push({ type: 'text', text: `Customer: ${d.customerName}`, align: 0 });
    if (d.customerPhone) spec.push({ type: 'text', text: `Phone: ${d.customerPhone}`, align: 0 });
    spec.push({ type: 'text', text: `Staff: ${d.servedBy || '—'}`, align: 0 });
    spec.push({ type: 'divider' });
    spec.push({ type: 'text', text: `Order Value: ${d.currency}${d.totalPayable}`, align: 0, bold: true });
    spec.push({ type: 'text', text: '*** CANCELLED ***', align: 1, bold: true });
    if (d.cancellationReason) {
      spec.push({ type: 'text', text: 'Cancellation Reason:', align: 0, bold: true });
      spec.push({ type: 'text', text: d.cancellationReason, align: 0 });
    }
    spec.push({ type: 'divider' });
    spec.push({ type: 'text', text: `Printed: ${d.printedAt}`, align: 1 });
    spec.push({ type: 'feed', lines: 4 });
    return spec;
  }

  if (d.address) spec.push({ type: 'text', text: d.address, align: 1 });
  if (d.phone) spec.push({ type: 'text', text: `Tel: ${d.phone}`, align: 1 });
  if (d.vatNumber) spec.push({ type: 'text', text: `VAT Reg: ${d.vatNumber}`, align: 1 });
  spec.push({ type: 'text', text: DOC_LABELS[d.type] || 'BILL', align: 1, bold: true });
  spec.push({ type: 'divider' });
  spec.push({ type: 'text', text: `Order: ${d.orderNumber}`, align: 0 });
  spec.push({ type: 'text', text: d.createdAt, align: 0 });
  if (d.tableNumber) spec.push({ type: 'text', text: `Table: ${d.tableNumber}`, align: 0 });
  if (d.customerName) spec.push({ type: 'text', text: `Customer: ${d.customerName}`, align: 0 });
  if (d.servedBy) spec.push({ type: 'text', text: `Served by: ${d.servedBy}`, align: 0 });
  spec.push({ type: 'divider' });
  // Widths total 30, not the printer's full 32. At exactly 32 the final character of a
  // right-aligned last column wraps to its own line ("Amount" printed as "Amoun"+"t"),
  // so leave two columns of slack.
  spec.push({ type: 'row', cols: ['Item', 'Qty', 'Amount'], widths: ITEM_COLS, align: [0, 1, 2] });
  d.rows.forEach(r => spec.push({ type: 'row', cols: [r.name, String(r.qty), `${d.currency}${r.amount}`], widths: ITEM_COLS, align: [0, 1, 2] }));
  spec.push({ type: 'divider' });
  spec.push({ type: 'row', cols: ['Food Price', `${d.currency}${d.subtotal}`], widths: SUM_COLS, align: [0, 2] });
  if (d.vatAmount) spec.push({ type: 'row', cols: ['VAT', `${d.currency}${d.vatAmount}`], widths: SUM_COLS, align: [0, 2] });
  if (d.serviceCharge) spec.push({ type: 'row', cols: ['Service Charge', `${d.currency}${d.serviceCharge}`], widths: SUM_COLS, align: [0, 2] });
  spec.push({ type: 'row', cols: ['Total', `${d.currency}${d.grossTotal}`], widths: SUM_COLS, align: [0, 2], bold: true });
  if (d.discountAmount) spec.push({ type: 'row', cols: ['Discount', `-${d.currency}${d.discountAmount}`], widths: SUM_COLS, align: [0, 2] });
  spec.push({ type: 'row', cols: ['Total Payable', `${d.currency}${d.totalPayable}`], widths: SUM_COLS, align: [0, 2], bold: true });
  if (d.paymentMode) {
    spec.push({ type: 'divider' });
    spec.push({ type: 'row', cols: ['Payment Mode', d.paymentMode], widths: SUM_COLS, align: [0, 2], bold: true });
  }
  spec.push({ type: 'divider' });
  if (d.type === 'due') {
    spec.push({ type: 'text', text: '*** DUE - PAYMENT PENDING ***', align: 1, bold: true });
    spec.push({ type: 'text', text: `Customer: ${d.customerName}`, align: 1 });
    spec.push({ type: 'text', text: `Phone: ${d.customerPhone}`, align: 1 });
  } else if (d.type === 'settled') {
    spec.push({ type: 'text', text: '*** PAID - SETTLED ***', align: 1, bold: true });
  }
  spec.push({ type: 'text', text: 'Thank you for dining with us!', align: 1 });
  spec.push({ type: 'feed', lines: 4 });
  return spec;
}

// The spec carries numeric alignment (0/1/2) matching the native Sunmi SDK docs, but the
// Capacitor wrapper exposes AlignmentModeEnum as strings — map across the boundary.
const ALIGN = ['left', 'center', 'right'];

// Interprets the spec against the Sunmi Capacitor bridge (window.Capacitor.Plugins.SunmiPrinter).
// Signatures verified against @kduma-autoid/capacitor-sunmi-printer 0.5.6.
async function printViaSunmi(bridge, spec) {
  await bridge.bindService();
  await bridge.printerInit();
  for (const line of spec) {
    if (line.type === 'divider') {
      await bridge.setBold({ enable: false });
      await bridge.setAlignment({ alignment: 'left' });
      await bridge.printText({ text: '--------------------------------\n' });
    } else if (line.type === 'text') {
      await bridge.setAlignment({ alignment: ALIGN[line.align ?? 0] });
      await bridge.setBold({ enable: !!line.bold });
      await bridge.printText({ text: `${line.text}\n` });
    } else if (line.type === 'row') {
      await bridge.setBold({ enable: !!line.bold });
      await bridge.printColumnsText({
        lines: line.cols.map((text, i) => ({
          text:  String(text),
          width: line.widths[i],
          align: ALIGN[line.align?.[i] ?? 0],
        })),
      });
    } else if (line.type === 'feed') {
      await bridge.setBold({ enable: false });
      await bridge.lineWrap({ lines: line.lines });
    }
  }
}

function openAndPrint(html) {
  const w = window.open('', '_blank', 'width=380,height=650');
  if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
}

// Single entry point every receipt call site should use.
export async function printReceipt({ type, order, items = [], restaurant = {} }) {
  const data = buildReceiptData({ type, order, items, restaurant });
  const sunmi = window.Capacitor?.Plugins?.SunmiPrinter;
  if (sunmi) {
    await printViaSunmi(sunmi, toSpec(data));
    return;
  }
  // Inside the Android shell there is no browser print dialog, so openAndPrint would
  // do nothing at all. Tell the user rather than leaving a dead button. Callers don't
  // all catch (some invoke this without await), so report instead of throwing.
  if (window.Capacitor?.isNativePlatform?.()) {
    console.warn('Sunmi printer bridge unavailable — this device has no attached printer.');
    toast.error('No printer on this device. Use a Sunmi terminal to print.');
    return;
  }
  openAndPrint(data.type === 'kitchen' ? toKitchenHtml(data) : toHtml(data));
}
