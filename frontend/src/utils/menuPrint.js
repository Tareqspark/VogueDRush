// Menu book printing — A4 document, not a 58mm thermal receipt.
// Deliberately separate from receipt.js: that renders a transaction record on a
// till roll, this renders a customer-facing menu on paper.
import toast from 'react-hot-toast';

const MENU_CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  color: #1a1a1a; margin: 0; padding: 0; line-height: 1.4;
}
.masthead { text-align: center; border-bottom: 3px double #1a1a1a; padding-bottom: 10px; margin-bottom: 6px; }
.rest-name { font-size: 30px; font-weight: 700; letter-spacing: 3px; margin: 0 0 4px; text-transform: uppercase; }
.rest-meta { font-size: 10px; color: #555; margin: 1px 0; font-family: Helvetica, Arial, sans-serif; }
.menu-word { font-size: 12px; letter-spacing: 7px; margin-top: 8px; text-transform: uppercase; color: #666; }
.sections { column-count: 2; column-gap: 14mm; margin-top: 12px; }
.category { break-inside: avoid-column; page-break-inside: avoid; margin: 0 0 16px; }
.cat-name {
  font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
  border-bottom: 1px solid #bbb; padding-bottom: 4px; margin: 0 0 8px;
}
.item { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px; }
/* Dot leaders: the name sits on a baseline of dots running to the price. */
.item-line { display: flex; align-items: baseline; gap: 4px; }
.item-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dots { flex: 1; border-bottom: 1px dotted #999; transform: translateY(-3px); min-width: 12px; }
.item-price { font-size: 12px; font-weight: 700; white-space: nowrap; }
.item-desc { font-size: 10px; color: #666; font-style: italic; margin-top: 1px; padding-right: 30px; }
.empty { text-align: center; color: #777; font-style: italic; padding: 30px 0; }
.footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #ddd; text-align: center;
  font-size: 9px; color: #888; font-family: Helvetica, Arial, sans-serif; column-span: all; }
@media print { .no-print { display: none !important; } }
`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const priceOf = (it) => parseFloat(it.effective_price ?? it.promotional_price ?? it.price ?? 0);

// Groups flat items into their categories, preserving the order the API returned
// (fc.display_order, then fi.display_order) rather than re-sorting alphabetically.
function groupByCategory(items) {
  const groups = [];
  const index = new Map();
  for (const it of items) {
    const key = it.category_name || 'Other';
    if (!index.has(key)) {
      index.set(key, { name: key, items: [] });
      groups.push(index.get(key));
    }
    index.get(key).items.push(it);
  }
  return groups;
}

export function buildMenuHtml({ items = [], restaurant = {} }) {
  const currency = restaurant.currency || '৳';
  const groups = groupByCategory(items);

  const body = groups.length === 0
    ? `<p class="empty">No available menu items to print.</p>`
    : groups.map(g => `
      <div class="category">
        <h2 class="cat-name">${esc(g.name)}</h2>
        ${g.items.map(it => `
          <div class="item">
            <div class="item-line">
              <span class="item-name">${esc(it.name)}</span>
              <span class="dots"></span>
              <span class="item-price">${currency}${priceOf(it).toFixed(2)}</span>
            </div>
            ${it.description ? `<div class="item-desc">${esc(it.description)}</div>` : ''}
          </div>`).join('')}
      </div>`).join('');

  const itemCount = items.length;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Menu — ${esc(restaurant.name || 'FoodPark')}</title>
  <style>${MENU_CSS}</style></head><body>
    <div class="masthead">
      <h1 class="rest-name">${esc(restaurant.name || 'FoodPark')}</h1>
      ${restaurant.address ? `<p class="rest-meta">${esc(restaurant.address)}</p>` : ''}
      ${restaurant.phone ? `<p class="rest-meta">Tel: ${esc(restaurant.phone)}</p>` : ''}
      ${restaurant.branchName ? `<p class="rest-meta">${esc(restaurant.branchName)}</p>` : ''}
      <div class="menu-word">Menu</div>
    </div>
    <div class="sections">${body}</div>
    <div class="footer">${itemCount} item${itemCount === 1 ? '' : 's'} &nbsp;·&nbsp; ${new Date().toLocaleDateString()}</div>
  </body></html>`;
}

export function printMenu({ items = [], restaurant = {} }) {
  // A menu book is an A4 document — there is no thermal path for it, and the
  // Android shell has no print dialog, so say so rather than opening nothing.
  if (window.Capacitor?.isNativePlatform?.()) {
    toast.error('Menu printing needs a browser — open the site on a computer.');
    return;
  }
  const html = buildMenuHtml({ items, restaurant });
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    toast.error('Popup blocked — allow popups to print the menu.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  // Let fonts and layout settle before the print dialog measures the page.
  setTimeout(() => w.print(), 400);
}
