const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbName = process.env.DB_NAME || 'foodpark';

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
  });

  try {
    const [foodItemCountRows] = await connection.query('SELECT COUNT(*) AS count FROM food_items');
    if (foodItemCountRows[0].count > 0) {
      console.log('Food items already exist. Seed skipped.');
      return;
    }

    const [adminRows] = await connection.query('SELECT id FROM users WHERE username = ? LIMIT 1', ['admin']);
    if (adminRows.length === 0) {
      const adminPasswordHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
      await connection.query(
        `INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'admin')`,
        ['admin', 'admin@foodpark.com', adminPasswordHash, 'System Administrator']
      );
    }

    const [categoryRows] = await connection.query('SELECT id, name FROM food_categories');
    const categoryIdByName = new Map(categoryRows.map((row) => [row.name, row.id]));

    const sampleItems = [
      ['Main Course', 'Chicken Biryani', 'Aromatic basmati rice with spiced chicken pieces', 320.0, 30],
      ['Main Course', 'Beef Burger', 'Juicy beef patty with lettuce, tomato, and house sauce', 280.0, 20],
      ['Appetizers', 'French Fries', 'Crispy golden fries with seasoning', 120.0, 12],
      ['Beverages', 'Lemon Mint', 'Fresh lemon and mint cooler', 90.0, 6],
      ['Desserts', 'Chocolate Brownie', 'Warm brownie served with chocolate syrup', 150.0, 10],
    ];

    for (const [categoryName, name, description, price, prepTime] of sampleItems) {
      const categoryId = categoryIdByName.get(categoryName);
      if (!categoryId) {
        continue;
      }

      await connection.query(
        `INSERT INTO food_items (category_id, name, description, price, preparation_time, is_available) VALUES (?, ?, ?, ?, ?, TRUE)`,
        [categoryId, name, description, price, prepTime]
      );
    }

    await connection.query(
      `INSERT INTO food_inventory (food_item_id, current_stock, min_stock_threshold, unit)
       SELECT fi.id, 50, 10, 'pieces'
       FROM food_items fi
       LEFT JOIN food_inventory inv ON inv.food_item_id = fi.id
       WHERE inv.id IS NULL`
    );

    console.log('Seed completed successfully.');
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
