// Shared receipt formatting — one data layer, two renderers (browser HTML print, Sunmi native print).
const RECEIPT_CSS = `@page{size:58mm auto;margin:0}
body{font-family:monospace;font-size:11px;padding:2mm;width:54mm;margin:auto;box-sizing:border-box}
h2{text-align:center;font-size:13px;margin:4px 0}p{text-align:center;margin:2px 0;color:#555}
table{width:100%;border-collapse:collapse;margin:8px 0}th{border-bottom:1px dashed #000;padding:3px 0;font-size:10px;text-align:left}
td{padding:2px 0;word-break:break-word}.divider{border-top:1px dashed #000;margin:6px 0}.total{font-weight:bold;font-size:12px}
.footer{text-align:center;margin-top:10px;font-size:9px;color:#777}
.banner{margin-top:10px;padding:6px;border:2px dashed;text-align:center;font-weight:bold}
@media print{body{margin:0;width:54mm}}`;

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const activeItems = (items) => (items || []).filter(i => i.status !== 'cancelled');

// Normalizes order/items/restaurant into one plain object consumed by both renderers below.
export function buildReceiptData({ type, order, items = [], restaurant = {} }) {
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
    printedAt: new Date().toLocaleString(),
  };
}

const TYPE_LABELS = { dine_in: 'Dine In', delivery: 'Delivery', direct: 'Takeaway' };

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
    `<tr><td>${r.name}</td><td style="text-align:center">${r.qty}</td><td style="text-align:right">${d.currency}${r.amount}</td></tr>`
  ).join('');
  const vatRow = d.vatAmount ? `<tr><td>VAT</td><td style="text-align:right">${d.currency}${d.vatAmount}</td></tr>` : '';
  const svcRow = d.serviceCharge ? `<tr><td>Service Charge</td><td style="text-align:right">${d.currency}${d.serviceCharge}</td></tr>` : '';
  const discRow = d.discountAmount ? `<tr><td>Discount</td><td style="text-align:right;color:#dc2626">-${d.currency}${d.discountAmount}</td></tr>` : '';

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
  <div class="divider"></div>
  <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${rowsHtml}</tbody></table>
  <div class="divider"></div>
  <table><tr><td>Food Price</td><td style="text-align:right">${d.currency}${d.subtotal}</td></tr>
  ${vatRow}${svcRow}
  <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${d.currency}${d.grossTotal}</strong></td></tr>
  ${discRow}
  <tr class="total"><td>Total Payable</td><td style="text-align:right">${d.currency}${d.totalPayable}</td></tr></table>
  <div class="divider"></div>
  ${banner}
  <p class="footer">Thank you for dining with us!</p><p class="footer">Please come again</p>
  </body></html>`;
}

// Printer-agnostic instruction list — consumed by the Sunmi bridge interpreter (align: 0=left,1=center,2=right).
function toSpec(d) {
  const spec = [
    { type: 'text', text: d.restaurantName, align: 1, bold: true },
  ];
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
  spec.push({ type: 'divider' });
  spec.push({ type: 'text', text: `Order: ${d.orderNumber}`, align: 0 });
  spec.push({ type: 'text', text: d.createdAt, align: 0 });
  if (d.tableNumber) spec.push({ type: 'text', text: `Table: ${d.tableNumber}`, align: 0 });
  if (d.customerName) spec.push({ type: 'text', text: `Customer: ${d.customerName}`, align: 0 });
  if (d.servedBy) spec.push({ type: 'text', text: `Served by: ${d.servedBy}`, align: 0 });
  spec.push({ type: 'divider' });
  spec.push({ type: 'row', cols: ['Item', 'Qty', 'Amount'], widths: [16, 4, 12], align: [0, 1, 2] });
  d.rows.forEach(r => spec.push({ type: 'row', cols: [r.name, String(r.qty), `${d.currency}${r.amount}`], widths: [16, 4, 12], align: [0, 1, 2] }));
  spec.push({ type: 'divider' });
  spec.push({ type: 'row', cols: ['Food Price', `${d.currency}${d.subtotal}`], widths: [20, 12], align: [0, 2] });
  if (d.vatAmount) spec.push({ type: 'row', cols: ['VAT', `${d.currency}${d.vatAmount}`], widths: [20, 12], align: [0, 2] });
  if (d.serviceCharge) spec.push({ type: 'row', cols: ['Service Charge', `${d.currency}${d.serviceCharge}`], widths: [20, 12], align: [0, 2] });
  spec.push({ type: 'row', cols: ['Total', `${d.currency}${d.grossTotal}`], widths: [20, 12], align: [0, 2], bold: true });
  if (d.discountAmount) spec.push({ type: 'row', cols: ['Discount', `-${d.currency}${d.discountAmount}`], widths: [20, 12], align: [0, 2] });
  spec.push({ type: 'row', cols: ['Total Payable', `${d.currency}${d.totalPayable}`], widths: [20, 12], align: [0, 2], bold: true });
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

// Interprets the spec against the Sunmi Capacitor bridge (window.Capacitor.Plugins.SunmiPrinter).
// Method names confirmed against @kduma-autoid/capacitor-sunmi-printer; plugin key TBC once installed (Phase C).
async function printViaSunmi(bridge, spec) {
  await bridge.bindService?.();
  for (const line of spec) {
    if (line.type === 'divider') {
      await bridge.printText({ text: '--------------------------------\n' });
    } else if (line.type === 'text') {
      await bridge.setAlignment?.({ alignment: line.align ?? 0 });
      await bridge.printText({ text: `${line.text}\n` });
    } else if (line.type === 'row') {
      await bridge.printColumnsText({ texts: line.cols, widths: line.widths, align: line.align });
    } else if (line.type === 'feed') {
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
  } else {
    openAndPrint(toHtml(data));
  }
}
