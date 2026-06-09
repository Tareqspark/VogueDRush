/**
 * seed-data.js — idempotent demo seed for all branches.
 * Safe to run multiple times: skips anything that already exists.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[rand(0, arr.length - 1)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

// Guaranteed-unique order number: epoch-seconds (base36) + 4 random chars
const uid = () =>
  Math.floor(Date.now() / 1000).toString(36).toUpperCase() +
  Math.random().toString(36).slice(2, 6).toUpperCase();
const orderNum = (branchId) => `ORD-B${branchId}-${uid()}`;

// ── menu data ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Starters',    icon: '🥗', display_order: 1 },
  { name: 'Biryani',     icon: '🍚', display_order: 2 },
  { name: 'Main Course', icon: '🍛', display_order: 3 },
  { name: 'Grills',      icon: '🍖', display_order: 4 },
  { name: 'Beverages',   icon: '🥤', display_order: 5 },
  { name: 'Desserts',    icon: '🍮', display_order: 6 },
];

const MENU = {
  Starters:    [
    { name: 'Chicken Soup',          price: 150, prep: 10 },
    { name: 'Vegetable Samosa (4pc)', price: 80,  prep: 8  },
    { name: 'Prawn Cocktail',         price: 220, prep: 12 },
    { name: 'Chicken Tikka (6pc)',    price: 320, prep: 18 },
    { name: 'Garlic Bread',           price: 90,  prep: 7  },
  ],
  Biryani:     [
    { name: 'Kacchi Biryani',         price: 380, prep: 25 },
    { name: 'Chicken Biryani',        price: 280, prep: 20 },
    { name: 'Mutton Biryani',         price: 420, prep: 25 },
    { name: 'Prawn Biryani',          price: 450, prep: 22 },
    { name: 'Vegetable Biryani',      price: 220, prep: 20 },
  ],
  'Main Course': [
    { name: 'Chicken Curry',          price: 260, prep: 20 },
    { name: 'Mutton Rogan Josh',      price: 380, prep: 25 },
    { name: 'Fish Bhuna',             price: 320, prep: 18 },
    { name: 'Dal Makhani',            price: 180, prep: 15 },
    { name: 'Butter Chicken',         price: 300, prep: 20 },
    { name: 'Palak Paneer',           price: 220, prep: 15 },
    { name: 'Beef Rezala',            price: 360, prep: 25 },
  ],
  Grills:      [
    { name: 'Mixed Grill Platter',    price: 680, prep: 30 },
    { name: 'Seekh Kebab (6pc)',      price: 320, prep: 20 },
    { name: 'Tandoori Chicken Half',  price: 380, prep: 25 },
    { name: 'Fish Tikka',             price: 350, prep: 20 },
  ],
  Beverages:   [
    { name: 'Mango Lassi',            price: 120, prep: 5  },
    { name: 'Masala Chai',            price: 60,  prep: 5  },
    { name: 'Fresh Lime Soda',        price: 80,  prep: 5  },
    { name: 'Cold Coffee',            price: 130, prep: 7  },
    { name: 'Mineral Water',          price: 30,  prep: 1  },
  ],
  Desserts:    [
    { name: 'Gulab Jamun (2pc)',      price: 90,  prep: 5  },
    { name: 'Kulfi',                  price: 110, prep: 5  },
    { name: 'Firni',                  price: 100, prep: 5  },
    { name: 'Chocolate Brownie',      price: 160, prep: 8  },
  ],
};

const TABLE_LOCS     = ['Indoor', 'Outdoor', 'VIP Room', 'Terrace', 'Private Dining'];
const CUSTOMERS      = ['Rafiq Ahmed','Nusrat Jahan','Karim Hossain','Shirin Akter',
                        'Mahbub Rahman','Tasnim Islam','Jahangir Alam','Ritu Das',
                        'Farhan Chowdhury','Maliha Begum','Sohel Rana','Priya Sen'];
const PAY_METHODS    = ['cash', 'card', 'mobile_banking'];
// valid ENUM values from the orders route validation
const ORDER_TYPES    = ['dine_in', 'delivery', 'direct'];

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'foodpark',
  });

  try {
    const q  = (sql, p = []) => conn.execute(sql, p);
    const q1 = async (sql, p = []) => { const [[r]] = await q(sql, p); return r; };

    const [[admin]] = await q(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
    const adminId   = admin?.id || 1;

    const [branches] = await q(`SELECT id, name FROM branches ORDER BY id`);
    if (!branches.length) { console.log('No branches found.'); return; }
    console.log(`Seeding ${branches.length} branch(es)…\n`);

    // ── categories (global, no branch_id) ────────────────────────────────────
    const catMap = {};
    for (const cat of CATEGORIES) {
      const existing = await q1(`SELECT id FROM food_categories WHERE name=?`, [cat.name]);
      if (existing) {
        catMap[cat.name] = existing.id;
      } else {
        const [r] = await q(
          `INSERT INTO food_categories (name, icon, display_order, is_active, created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [cat.name, cat.icon, cat.display_order]
        );
        catMap[cat.name] = r.insertId;
      }
    }
    console.log('✓ Categories ready');

    for (const branch of branches) {
      console.log(`\n══ Branch ${branch.id}: ${branch.name} ══`);

      // ── food items ──────────────────────────────────────────────────────────
      const itemIds = [];
      const itemPrice = {};
      for (const [catName, items] of Object.entries(MENU)) {
        const catId = catMap[catName];
        const take  = catName === 'Main Course' ? 3 : 2;
        for (const item of shuffle(items).slice(0, take)) {
          const ex = await q1(
            `SELECT id, price FROM food_items WHERE name=? AND branch_id=?`,
            [item.name, branch.id]
          );
          if (ex) {
            itemIds.push(ex.id);
            itemPrice[ex.id] = parseFloat(ex.price);
          } else {
            const [r] = await q(
              `INSERT INTO food_items
                 (category_id, branch_id, name, price, vat_rate, is_available, preparation_time, display_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, 0, 1, ?, 0, NOW(), NOW())`,
              [catId, branch.id, item.name, item.price, item.prep]
            );
            itemIds.push(r.insertId);
            itemPrice[r.insertId] = item.price;
          }
        }
      }
      console.log(`  ✓ ${itemIds.length} food items`);

      // ── tables (20 per branch) ──────────────────────────────────────────────
      const tableIds = [];
      for (let t = 1; t <= 20; t++) {
        const ex = await q1(
          `SELECT id FROM \`tables\` WHERE table_number=? AND branch_id=?`,
          [t, branch.id]
        );
        if (ex) { tableIds.push(ex.id); continue; }
        const loc = TABLE_LOCS[Math.floor((t - 1) / 4)];
        const cap = pick([2, 2, 4, 4, 6]);
        const [r] = await q(
          `INSERT INTO \`tables\` (table_number, capacity, location, status, branch_id, created_at, updated_at)
           VALUES (?, ?, ?, 'available', ?, NOW(), NOW())`,
          [t, cap, loc, branch.id]
        );
        tableIds.push(r.insertId);
      }
      console.log(`  ✓ ${tableIds.length} tables`);

      // ── orders: skip branch if already has ≥ 20 ────────────────────────────
      const existing = await q1(
        `SELECT COUNT(*) AS cnt FROM orders WHERE branch_id=?`, [branch.id]
      );
      if (existing.cnt >= 20) {
        console.log(`  ⏭  Orders already seeded (${existing.cnt} found)`);
        continue;
      }

      // 12 done · 4 preparing · 2 pending · 2 ready
      const PLAN = shuffle([
        ...Array(12).fill('done'),
        ...Array(4).fill('preparing'),
        ...Array(2).fill('pending'),
        ...Array(2).fill('ready'),
      ]);

      let ok = 0, fail = 0;
      for (const finalStatus of PLAN) {
        try {
          const otype      = finalStatus === 'done' ? pick(ORDER_TYPES) : 'dine_in';
          const tableId    = otype === 'dine_in' ? pick(tableIds) : null;
          const custName   = ['delivery','direct'].includes(otype) ? pick(CUSTOMERS) : null;

          const lines = shuffle(itemIds).slice(0, rand(2, 4)).map(fid => {
            const qty = rand(1, 3);
            const up  = itemPrice[fid] || 200;
            return { fid, qty, up, total: up * qty };
          });

          const subtotal      = lines.reduce((s, l) => s + l.total, 0);
          const vatAmount     = parseFloat((subtotal * 0.05).toFixed(2));
          const svcCharge     = parseFloat((subtotal * 0.03).toFixed(2));
          const totalAmount   = parseFloat((subtotal + vatAmount + svcCharge).toFixed(2));

          const daysAgo  = rand(0, 30);
          const oDate    = new Date(Date.now() - daysAgo * 86400000)
                            .toISOString().slice(0, 19).replace('T', ' ');

          const [oRes] = await q(
            `INSERT INTO orders
               (order_number, branch_id, order_type, table_id, waiter_id, customer_name,
                status, subtotal, vat_amount, service_charge, discount_amount, total_amount,
                created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            [orderNum(branch.id), branch.id, otype, tableId, adminId, custName,
             finalStatus, subtotal, vatAmount, svcCharge, totalAmount, oDate, oDate]
          );
          const oid = oRes.insertId;

          const iStatus = { done:'served', ready:'ready', preparing:'preparing', pending:'pending' }[finalStatus];
          for (const l of lines) {
            await q(
              `INSERT INTO order_items
                 (order_id, food_item_id, quantity, unit_price, total_price, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [oid, l.fid, l.qty, l.up, l.total, iStatus, oDate]
            );
          }

          if (finalStatus === 'done') {
            await q(
              `INSERT INTO payments (order_id, payment_method, amount, status, created_at)
               VALUES (?, ?, ?, 'completed', ?)`,
              [oid, pick(PAY_METHODS), totalAmount, oDate]
            );
          }
          ok++;
        } catch (err) {
          console.error(`  ✗ Order failed: ${err.message}`);
          fail++;
        }
      }
      console.log(`  ✓ ${ok} orders inserted${fail ? `, ${fail} failed` : ''}`);
    }

    console.log('\n✅ Seed complete!\n');
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
