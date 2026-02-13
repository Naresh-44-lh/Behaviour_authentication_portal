import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const DB_HOST = process.env.DB_HOST
const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_NAME = process.env.DB_NAME || 'auth_portal'

let pool = null

async function initDB() {
  if (!DB_HOST || !DB_USER) {
    console.log('MySQL not configured (DB_HOST/DB_USER missing). Using in-memory fallback.')
    return null
  }

  // Create database if not exists
  const tmpConn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD })
  await tmpConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``)
  await tmpConn.end()

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_activity (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      username VARCHAR(100),
      login_time DATETIME,
      ip_address VARCHAR(100),
      device VARCHAR(500),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  // Seed default users if missing
  const [adminRows] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin'])
  if (adminRows.length === 0) {
    const hash = await bcrypt.hash('admin123', 10)
    await pool.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', ['admin', 'admin@example.com', hash, 'admin'])
    console.log('Seeded admin user (admin / admin123)')
  }

  const [userRows] = await pool.query('SELECT id FROM users WHERE username = ?', ['user1'])
  if (userRows.length === 0) {
    const hash = await bcrypt.hash('user123', 10)
    await pool.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', ['user1', 'user1@example.com', hash, 'user'])
    console.log('Seeded user1 (user1 / user123)')
  }

  return pool
}

async function getUserByUsername(username) {
  if (!pool) return null
  const [rows] = await pool.query('SELECT id, username, email, password, role FROM users WHERE username = ?', [username])
  return rows[0] || null
}

async function createUser(username, email, password, role = 'user') {
  if (!pool) return null
  const hash = await bcrypt.hash(password, 10)
  const [result] = await pool.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hash, role])
  return { id: result.insertId, username, email, role }
}

async function recordActivity(entry) {
  if (!pool) return null
  const { userId, username, loginTime, ipAddress, device } = entry
  const [result] = await pool.query('INSERT INTO login_activity (user_id, username, login_time, ip_address, device) VALUES (?, ?, ?, ?, ?)', [userId, username, loginTime, ipAddress, device])
  return result.insertId
}

async function getActivitiesForUser(userId) {
  if (!pool) return []
  const [rows] = await pool.query('SELECT id, user_id AS userId, username, login_time AS loginTime, ip_address AS ipAddress, device FROM login_activity WHERE user_id = ? ORDER BY login_time DESC', [userId])
  return rows
}

async function getAllActivities() {
  if (!pool) return []
  const [rows] = await pool.query('SELECT id, user_id AS userId, username, login_time AS loginTime, ip_address AS ipAddress, device FROM login_activity ORDER BY login_time DESC')
  return rows
}

export default {
  initDB,
  getUserByUsername,
  createUser,
  recordActivity,
  getActivitiesForUser,
  getAllActivities,
  getPool: () => pool
}
