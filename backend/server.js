import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import db from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Middleware
app.use(cors())
app.use(express.json())

let usingDB = false
// In-memory fallback storage
const users = []
const loginActivity = []
let activityIdCounter = 1

// Initialize DB (if configured)
;(async () => {
  try {
    const pool = await db.initDB()
    if (pool) {
      usingDB = true
      console.log('Using MySQL for persistence')
    } else {
      console.log('MySQL not available — using in-memory fallback')
      // Seed demo accounts into in-memory store so demo works without MySQL
      try {
        const adminHash = await bcryptjs.hash('admin123', 10)
        const userHash = await bcryptjs.hash('user123', 10)
        users.push({ id: 1, username: 'admin', email: 'admin@example.com', password: adminHash, role: 'admin' })
        users.push({ id: 2, username: 'user1', email: 'user1@example.com', password: userHash, role: 'user' })
        console.log('Seeded in-memory demo users: admin / admin123, user1 / user123')
      } catch (seedErr) {
        console.error('Error seeding in-memory users:', seedErr)
      }
    }
  } catch (err) {
    console.error('DB initialization error:', err)
  }
})()

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Auth Routes
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing required fields' })

  try {
    if (usingDB) {
      const existing = await db.getUserByUsername(username)
      if (existing) return res.status(400).json({ error: 'Username already exists' })
      await db.createUser(username, email, password)
      return res.json({ message: 'User registered successfully' })
    }

    if (users.some(u => u.username === username)) return res.status(400).json({ error: 'Username already exists' })
    const hashedPassword = await bcryptjs.hash(password, 10)
    const newUser = { id: users.length + 1, username, email, password: hashedPassword, role: 'user' }
    users.push(newUser)
    res.json({ message: 'User registered successfully' })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  try {
    let user = null
    if (usingDB) {
      user = await db.getUserByUsername(username)
      if (!user) return res.status(401).json({ error: 'Invalid credentials' })
      const validPassword = await bcryptjs.compare(password, user.password)
      if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' })

      // Record activity
      await db.recordActivity({ userId: user.id, username: user.username, loginTime: new Date(), ipAddress: req.ip || '127.0.0.1', device: req.get('user-agent') || 'Unknown' })

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
      return res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } })
    }

    user = users.find(u => u.username === username)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const validPassword = await bcryptjs.compare(password, user.password)
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' })

    // Record login activity in-memory
    const activity = { id: activityIdCounter++, userId: user.id, username: user.username, loginTime: new Date().toISOString(), ipAddress: req.ip || '127.0.0.1', device: req.get('user-agent') || 'Unknown' }
    loginActivity.push(activity)

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Activity Routes
app.get('/activity/my-activity', verifyToken, async (req, res) => {
  try {
    if (usingDB) {
      const rows = await db.getActivitiesForUser(req.user.id)
      return res.json(rows)
    }
    const userActivities = loginActivity.filter(a => a.userId === req.user.id)
    res.json(userActivities.slice().reverse())
  } catch (err) {
    console.error('Activity fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

app.get('/activity/all-activity', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    if (usingDB) {
      const rows = await db.getAllActivities()
      return res.json(rows)
    }
    res.json(loginActivity.slice().reverse())
  } catch (err) {
    console.error('All activity fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
  console.log(`\nDefault accounts:`)
  console.log(`Admin - username: admin, password: admin123`)
  console.log(`User - username: user1, password: user123`)
})
