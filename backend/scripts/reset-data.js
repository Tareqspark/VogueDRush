/**
 * reset-data.js — wipe all transactional + menu data, keep admin user + settings.
 * Run from the backend directory: node scripts/reset-data.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'foodpark',
    multipleStatements: true,
  });

  try {
    console.log('Connected to', process.env.DB_NAME || 'foodpark');

    // Helper: truncate a table if it exists
    const truncate = async (table) => {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
      );
      if (rows[0].cnt > 0) {
        await conn.execute(`DELETE FROM \`${table}\``);
        await conn.execute(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
        console.log(`  ✓ cleared ${table}`);
      } else {
        console.log(`  – skipped ${table} (table not found)`);
      }
    };

    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('\n── Clearing transactional data ──');

    // Orders & billing
    await truncate('order_modifications');
    await truncate('kitchen_queue');
    await truncate('delivery_tracking');
    await truncate('delivery_details');
    await truncate('payments');
    await truncate('order_items');
    await truncate('orders');

    // Reservations
    await truncate('reservations');

    // Tables (physical restaurant tables)
    await truncate('tables');

    console.log('\n── Clearing menu ──');
    await truncate('food_inventory');
    await truncate('recipes');
    await truncate('food_items');
    await truncate('food_categories');

    console.log('\n── Clearing inventory / procurement ──');
    await truncate('waste_logs');
    await truncate('expenses');
    await truncate('grn_items');
    await truncate('goods_received_notes');
    await truncate('purchase_order_items');
    await truncate('purchase_orders');
    await truncate('supplier_ledger');
    await truncate('stock_ledger');
    await truncate('ingredients');
    await truncate('suppliers');

    console.log('\n── Clearing sessions & audit ──');
    await truncate('audit_logs');
    await truncate('token_blacklist');
    await truncate('user_sessions');

    console.log('\n── Removing non-admin users ──');
    const [del] = await conn.execute(`DELETE FROM users WHERE role != 'admin'`);
    console.log(`  ✓ removed ${del.affectedRows} non-admin user(s)`);

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Verify admin is intact
    const [admins] = await conn.execute(`SELECT id, username, full_name, role FROM users WHERE role = 'admin'`);
    console.log('\n── Admin account(s) kept ──');
    admins.forEach(u => console.log(`  id=${u.id}  username=${u.username}  name=${u.full_name}`));

    console.log('\n✅ Reset complete. system_settings and branches untouched.\n');
  } finally {
    await conn.end();
  }
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
