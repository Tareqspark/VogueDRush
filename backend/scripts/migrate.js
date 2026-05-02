const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbName = process.env.DB_NAME || 'foodpark';

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    const [rows] = await connection.query(
      `SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = ?`,
      [dbName]
    );

    if (rows[0].tableCount > 0) {
      console.log(`Database \"${dbName}\" already has tables. Migration skipped.`);
      return;
    }

    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    await connection.query(schemaSql);
    console.log(`Migration completed successfully for database \"${dbName}\".`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
