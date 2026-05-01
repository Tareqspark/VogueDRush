const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection pool configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vogue_cafe_drush',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(poolConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Execute transaction
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Get single record
const findOne = async (table, conditions = {}, select = '*') => {
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const values = Object.values(conditions);
  const sql = `SELECT ${select} FROM ${table} WHERE ${whereClause} LIMIT 1`;
  const rows = await query(sql, values);
  return rows[0] || null;
};

// Get multiple records
const findMany = async (table, conditions = {}, select = '*', orderBy = '', limit = '') => {
  let sql = `SELECT ${select} FROM ${table}`;
  const values = [];
  
  if (Object.keys(conditions).length > 0) {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    sql += ` WHERE ${whereClause}`;
    values.push(...Object.values(conditions));
  }
  
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }
  
  if (limit) {
    sql += ` LIMIT ${limit}`;
  }
  
  return await query(sql, values);
};

// Insert record
const insert = async (table, data) => {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const sql = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
  const result = await query(sql, values);
  return { id: result.insertId, ...data };
};

// Update record
const update = async (table, data, conditions) => {
  const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const values = [...Object.values(data), ...Object.values(conditions)];
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  await query(sql, values);
  return true;
};

// Delete record
const remove = async (table, conditions) => {
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const values = Object.values(conditions);
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  await query(sql, values);
  return true;
};

// Close all connections
const end = async () => {
  await pool.end();
  console.log('Database connections closed');
};

module.exports = {
  pool,
  query,
  transaction,
  findOne,
  findMany,
  insert,
  update,
  remove,
  testConnection,
  end
};
