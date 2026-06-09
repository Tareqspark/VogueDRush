/**
 * seed-data.js — populate all branches with demo menu, tables & orders.
 * Run from the backend directory: node scripts/seed-data.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// ── helpers ───────────────────────────────────────────────────────────────────
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[rand(0, arr.length - 1)];
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

let orderSeq = Math.floor(Math.random() * 90000) + 10000; // random start — unique per run
const nextOrderNum = (branchId) => `ORD-B${branchId}-${++orderSeq}`;

// ── menu catalogue (shared across branches) ───────────────────────────────────
const CATEGORIES = [
  { name: 'Starters',   icon: '🥗', display_order: 1 },
  { name: 'Biryani',    icon: '🍚', display_order: 2 },
  { name: 'Main Course',icon: '🍛', display_order: 3 },
  { name: 'Grills',     icon: '🍖', display_order: 4 },
  { name: 'Beverages',  icon: '🥤', display_order: 5 },
  { name: 'Desserts',   icon: '🍮', display_order: 6 },
];

const ITEMS_BY_CATEGORY = {
  'Starters':    [
    { name: 'Chicken Soup',        price: 150, prep: 10 },
    { name: 'Vegetable Samosa (4)', price: 80,  prep: 8  },
    { name: 'Prawn Cocktail',       price: 220, prep: 12 },
    { name: 'Chicken Tikka (6pc)',  price: 320, prep: 18 },
    { name: 'Garlic Bread',         price: 90,  prep: 7  },
  ],
  'Biryani':     [
    { name: 'Kacchi Biryani',       price: 380, prep: 25 },
    { name: 'Chicken Biryani',      price: 280, prep: 20 },
    { name: 'Mutton Biryani',       price: 420, prep: 25 },
    { name: 'Prawn Biryani',        price: 450, prep: 22 },
    { name: 'Vegetable Biryani',    price: 220, prep: 20 },
  ],
  'Main Course': [
    { name: 'Chicken Curry',        price: 260, prep: 20 },
    { name: 'Mutton Rogan Josh',    price: 380, prep: 25 },
    { name: 'Fish Bhuna',           price: 320, prep: 18 },
    { name: 'Dal Makhani',          price: 180, prep: 15 },
    { name: 'Butter Chicken',       price: 300, prep: 20 },
    { name: 'Palak Paneer',         price: 220, prep: 15 },
    { name: 'Beef Rezala',          price: 360, prep: 25 },
  ],
  'Grills':      [
    { name: 'Mixed Grill Platter',  price: 680, prep: 30 },
    { name: 'Seekh Kebab (6pc)',    price: 320, prep: 20 },
    { name: 'Tandoori Chicken Half',price: 380, prep: 25 },
    { name: 'Fish Tikka',           price: 350, prep: 20 },
  ],
  'Beverages':   [
    { name: 'Mango Lassi',          price: 120, prep: 5  },
    { name: 'Masala Chai',          price: 60,  prep: 5  },
    { name: 'Fresh Lime Soda',      price: 80,  prep: 5  },
    { name: 'Cold Coffee',          price: 130, prep: 7  },
    { name: 'Mineral Water',        price: 30,  prep: 1  },
  ],
  'Desserts':    [
    { name: 'Gulab Jamun (2pc)',    price: 90,  prep: 5  },
    { name: 'Kulfi',                price: 110, prep: 5  },
    { name: 'Firni',                price: 100, prep: 5  },
    { name: 'Chocolate Brownie',    price: 160, prep: 8  },
  ],
};

// Pick 12-15 items spread across categories
function pickMenuItems(categoryMap) {
  const result = [];
  for (const [catName, items] of Object.entries(ITEMS_BY_CATEGORY)) {
    const catId = categoryMap[catName];
    if (!catId) continue;
    // take 2-3 from each category
    const take = catName === 'Main Course' ? 3 : catName === 'Grills' ? 2 : 2;
    shuffle(items).slice(0, take).forEach(item => result.push({ ...item, category_id: catId }));
  }
  return result;
}

const TABLE_LOCATIONS = ['Indoor', 'Outdoor', 'VIP Room', 'Terrace', 'Private Dining'];
const CUSTOMER_NAMES  = ['Rafiq Ahmed', 'Nusrat Jahan', 'Karim Hossain', 'Shirin Akter',
                         'Mahbub Rahman', 'Tasnim Islam', 'Jahangir Alam', 'Ritu Das',
                         'Farhan Chowdhury', 'Maliha Begum', 'Sohel Rana', 'Priya Sen'];
const PAYMENT_METHODS = ['cash', 'card', 'mobile_banking'];
const ORDER_TYPES     = ['dine_in', 'delivery', 'direct'];

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'foodpark',
  });

  try {
    // get admin user id for waiter_id
    const [[admin]] = await conn.execute(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
    const adminId = admin?.id || 1;

    // get all branches
    const [branches] = await conn.execute(`SELECT id, name FROM branches ORDER BY id`);
    if (!branches.length) { console.log('No branches found — create branches first.'); return; }
    console.log(`Found ${branches.length} branch(es)\n`);

    for (const branch of branches) {
      console.log(`\n══ Branch ${branch.id}: ${branch.name} ══`);

      // ── 1. Categories (shared names, but per-branch records aren't needed —
      //        food_categories has no branch_id; items carry branch_id) ──────
      const categoryMap = {};
      for (const cat of CATEGORIES) {
        const [existing] = await conn.execute(
          `SELECT id FROM food_categories WHERE name = ?`, [cat.name]
        );
        let catId;
        if (existing.length) {
          catId = existing[0].id;
        } else {
          const [r] = await conn.execute(
            `INSERT INTO food_categories (name, icon, display_order, is_active, created_at, updated_at)
             VALUES (?, ?, ?, 1, NOW(), NOW())`,
            [cat.name, cat.icon, cat.display_order]
          );
          catId = r.insertId;
        }
        categoryMap[cat.name] = catId;
      }
      console.log(`  ✓ Categories ready`);

      // ── 2. Food items ─────────────────────────────────────────────────────
      const menuItems = pickMenuItems(categoryMap);
      const foodItemIds = [];
      const foodItemPrices = {};
      for (const item of menuItems) {
        const [dup] = await conn.execute(
          `SELECT id, price FROM food_items WHERE name=? AND branch_id=?`, [item.name, branch.id]
        );
        if (dup.length) {
          foodItemIds.push(dup[0].id);
          foodItemPrices[dup[0].id] = parseFloat(dup[0].price);
          continue;
        }
        const [r] = await conn.execute(
          `INSERT INTO food_items (category_id, branch_id, name, price, vat_rate, is_available, preparation_time, display_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 1, ?, 0, NOW(), NOW())`,
          [item.category_id, branch.id, item.name, item.price, item.prep]
        );
        foodItemIds.push(r.insertId);
        foodItemPrices[r.insertId] = item.price;
      }
      console.log(`  ✓ ${foodItemIds.length} food items`);

      // ── 3. Tables (20 per branch, numbered 1-20) ──────────────────────────
      const tableIds = [];
      for (let t = 1; t <= 20; t++) {
        const [dup] = await conn.execute(
          `SELECT id FROM tables WHERE table_number=? AND branch_id=?`, [t, branch.id]
        );
        if (dup.length) { tableIds.push(dup[0].id); continue; }
        const location = TABLE_LOCATIONS[Math.floor((t - 1) / 4)]; // 4 tables per location
        const capacity = [2, 2, 4, 4, 6][rand(0, 4)];
        const [r] = await conn.execute(
          `INSERT INTO tables (table_number, capacity, location, status, branch_id, created_at, updated_at)
           VALUES (?, ?, ?, 'available', ?, NOW(), NOW())`,
          [t, capacity, location, branch.id]
        );
        tableIds.push(r.insertId);
      }
      console.log(`  ✓ ${tableIds.length} tables`);

      // ── 4. Orders (20 per branch) ─────────────────────────────────────────
      // 12 done, 4 preparing, 2 pending, 2 ready
      const ORDER_PLAN = [
        ...Array(12).fill('done'),
        ...Array(4).fill('preparing'),
        ...Array(2).fill('pending'),
        ...Array(2).fill('ready'),
      ];

      let ordersCreated = 0;
      for (const finalStatus of shuffle(ORDER_PLAN)) {
        const orderType = finalStatus === 'done' ? pick(['dine_in', 'delivery', 'direct']) : 'dine_in';
        const tableId   = orderType === 'dine_in' ? pick(tableIds) : null;
        const customerName = ['delivery', 'direct'].includes(orderType) ? pick(CUSTOMER_NAMES) : null;

        // pick 2-4 random items
        const pickedItems = shuffle(foodItemIds).slice(0, rand(2, 4));
        let subtotal = 0;
        const lineItems = pickedItems.map(fid => {
          const qty = rand(1, 3);
          const unitPrice = foodItemPrices[fid] || 200;
          subtotal += unitPrice * qty;
          return { food_item_id: fid, quantity: qty, unit_price: unitPrice, total_price: unitPrice * qty };
        });

        const vatAmount      = parseFloat((subtotal * 0.05).toFixed(2));
        const serviceCharge  = parseFloat((subtotal * 0.03).toFixed(2));
        const totalAmount    = parseFloat((subtotal + vatAmount + serviceCharge).toFixed(2));

        // random date within last 30 days
        const daysAgo = rand(0, 30);
        const orderDate = new Date(Date.now() - daysAgo * 86400000);
        const orderDateStr = orderDate.toISOString().slice(0, 19).replace('T', ' ');

        const [orderRes] = await conn.execute(
          `INSERT INTO orders (order_number, branch_id, order_type, table_id, waiter_id, customer_name,
            status, subtotal, vat_amount, service_charge, discount_amount, total_amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
          [nextOrderNum(branch.id), branch.id, orderType, tableId, adminId, customerName,
           finalStatus, subtotal, vatAmount, serviceCharge, totalAmount, orderDateStr, orderDateStr]
        );
        const orderId = orderRes.insertId;

        // insert order items
        const itemStatus = finalStatus === 'done' ? 'served'
                        : finalStatus === 'ready' ? 'ready'
                        : finalStatus === 'preparing' ? 'preparing' : 'pending';
        for (const li of lineItems) {
          await conn.execute(
            `INSERT INTO order_items (order_id, food_item_id, quantity, unit_price, total_price, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [orderId, li.food_item_id, li.quantity, li.unit_price, li.total_price, itemStatus, orderDateStr]
          );
        }

        // insert payment for completed orders
        if (finalStatus === 'done') {
          await conn.execute(
            `INSERT INTO payments (order_id, payment_method, amount, status, created_at)
             VALUES (?, ?, ?, 'completed', ?)`,
            [orderId, pick(PAYMENT_METHODS), totalAmount, orderDateStr]
          );
        }

        ordersCreated++;
      }
      console.log(`  ✓ ${ordersCreated} orders (12 done, 4 preparing, 2 pending, 2 ready)`);
    }

    console.log('\n✅ Seed complete!\n');
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
