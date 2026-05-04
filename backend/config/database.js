const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection pool configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'foodpark',
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

// Execute transaction with proper error handling
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

// Execute transaction with isolation level
const transactionWithIsolation = async (callback, isolationLevel = 'READ_COMMITTED') => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
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

const buildWhereClause = (conditions = {}) => {
  const clauses = [];
  const values = [];

  Object.entries(conditions).forEach(([key, value]) => {
    if (value === null) {
      clauses.push(`${key} IS NULL`);
      return;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([operator, operand]) => {
        switch (operator) {
          case '$ne':
            clauses.push(`${key} != ?`);
            values.push(operand);
            break;
          case '$gt':
            clauses.push(`${key} > ?`);
            values.push(operand);
            break;
          case '$gte':
            clauses.push(`${key} >= ?`);
            values.push(operand);
            break;
          case '$lt':
            clauses.push(`${key} < ?`);
            values.push(operand);
            break;
          case '$lte':
            clauses.push(`${key} <= ?`);
            values.push(operand);
            break;
          case '$like':
            clauses.push(`${key} LIKE ?`);
            values.push(operand);
            break;
          case '$in':
            if (Array.isArray(operand) && operand.length > 0) {
              clauses.push(`${key} IN (${operand.map(() => '?').join(', ')})`);
              values.push(...operand);
            }
            break;
          default:
            clauses.push(`${key} = ?`);
            values.push(operand);
        }
      });
      return;
    }

    clauses.push(`${key} = ?`);
    values.push(value);
  });

  return {
    whereClause: clauses.length > 0 ? clauses.join(' AND ') : '1=1',
    values
  };
};

// Get single record with optional lock
const findOne = async (table, conditions = {}, select = '*', lock = null) => {
  let selectClause = '*';
  let whereClause = '1=1';
  let values = [];

  if (typeof conditions === 'string') {
    whereClause = conditions;
    if (Array.isArray(select)) {
      values = select;
    } else {
      selectClause = select || '*';
    }
  } else {
    const built = buildWhereClause(conditions);
    whereClause = built.whereClause;
    values = built.values;
    selectClause = typeof select === 'string' ? select : '*';
  }

  let sql = `SELECT ${selectClause} FROM ${table} WHERE ${whereClause} LIMIT 1`;

  if (lock && typeof lock === 'string') {
    sql += ` FOR ${lock}`;
  }

  const rows = await query(sql, values);
  return rows[0] || null;
};

// Get multiple records with advanced filtering
const findMany = async (table, conditions = {}, select = '*', orderBy = '', limit = '', join = null) => {
  let sql = `SELECT ${select} FROM ${table}`;
  let values = [];
  
  // Add joins if specified
  if (join) {
    sql += ` ${join}`;
  }

  if (typeof conditions === 'string') {
    sql += ` WHERE ${conditions}`;
  } else if (Object.keys(conditions).length > 0) {
    const built = buildWhereClause(conditions);
    sql += ` WHERE ${built.whereClause}`;
    values = built.values;
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

// Insert record, silently ignore duplicate key violations
const insertIgnore = async (table, data) => {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const sql = `INSERT IGNORE INTO ${table} (${fields}) VALUES (${placeholders})`;
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
  transactionWithIsolation,
  findOne,
  findMany,
  insert,
  insertIgnore,
  update,
  remove,
  testConnection,
  end
};
