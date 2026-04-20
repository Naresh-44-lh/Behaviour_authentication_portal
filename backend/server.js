import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import bcryptjs from 'bcryptjs'
import db from './db.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('WARNING: Running in production with default JWT_SECRET. This is insecure!')
}

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://behaviour-authentication-portal.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

// API Route Middleware to handle frontend connections
app.use((req, res, next) => {
  if (req.url.startsWith('/_/backend/')) {
    req.url = req.url.replace('/_/backend', '')
  }
  next()
})

let usingDB = false
// In-memory fallback storage
const users = []
const loginActivity = []
let activityIdCounter = 1
const userMetrics = []
let metricsIdCounter = 1
const studentRecords = []
let studentRecordIdCounter = 1
const notices = []

// Initialize DB (if configured)
;(async () => {
  try {
    const pool = await db.initDB()
    if (pool) {
      usingDB = true
      console.log('Using database for persistence')
    } else {
      console.log('DB not available — using in-memory fallback')
      // Seed demo accounts into in-memory store so demo works without MySQL
      try {
          const adminHash = await bcryptjs.hash('admin123', 10)
          const student1Hash = await bcryptjs.hash('student123', 10)
          const student2Hash = await bcryptjs.hash('student234', 10)
          const student3Hash = await bcryptjs.hash('student345', 10)
          const facultyHash = await bcryptjs.hash('faculty123', 10)

          users.push({ id: 1, username: 'admin', email: 'admin@example.com', password: adminHash, role: 'admin' })
          users.push({ id: 2, username: 'student1', email: 'student1@example.com', password: student1Hash, role: 'student' })
          users.push({ id: 3, username: 'student2', email: 'student2@example.com', password: student2Hash, role: 'student' })
          users.push({ id: 4, username: 'student3', email: 'student3@example.com', password: student3Hash, role: 'student' })
          users.push({ id: 5, username: 'faculty1', email: 'faculty1@example.com', password: facultyHash, role: 'faculty' })

          studentRecords.push({ id: studentRecordIdCounter++, userId: 2, marks: 'Not graded', subjectGrades: {}, daysPresent: 0, daysAbsent: 0, updatedAt: new Date().toISOString() })
          studentRecords.push({ id: studentRecordIdCounter++, userId: 3, marks: 'Not graded', subjectGrades: {}, daysPresent: 0, daysAbsent: 0, updatedAt: new Date().toISOString() })
          studentRecords.push({ id: studentRecordIdCounter++, userId: 4, marks: 'Not graded', subjectGrades: {}, daysPresent: 0, daysAbsent: 0, updatedAt: new Date().toISOString() })
          notices.push({
            id: Date.now(),
            title: 'Welcome to the student portal',
            message: 'This is your secure learning hub. Check marks, attendance, and notices here.',
            postedBy: 5,
            postedByName: 'faculty1',
            createdAt: new Date().toISOString()
          })
          notices.push({
            id: Date.now() + 1,
            title: 'Reminder',
            message: 'Complete your profile and review your course schedule for the week.',
            postedBy: 5,
            postedByName: 'faculty1',
            createdAt: new Date().toISOString()
          })
        console.log('Seeded in-memory demo users: admin / admin123, student1 / student123, student2 / student234, student3 / student345, faculty1 / faculty123')
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
    // Return a more specific error message when available to help the frontend
    res.status(500).json({ error: error.message || 'Registration failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  const { username, password, captchaToken, location } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  // Validate CAPTCHA
  if (!captchaToken) {
    return res.status(400).json({ error: 'CAPTCHA verification required' })
  }

  // For development, accept the test CAPTCHA token
  // In production, verify with Google reCAPTCHA API
  const validCaptcha = captchaToken === '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' ||
                      (captchaToken && captchaToken.length > 20) // Basic validation for real tokens

  if (!validCaptcha) {
    return res.status(400).json({ error: 'Invalid CAPTCHA verification' })
  }

  try {
    let user = null
    if (usingDB) {
      user = await db.getUserByUsername(username)
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      if (user.isBlocked) {
        return res.status(403).json({ error: 'You are restricted by ADMIN please contact admin' })
      }

      // check temporary expiry
      if (user.isTemporary && user.expiresAt) {
        const exp = new Date(user.expiresAt)
        if (isNaN(exp.getTime()) || exp < new Date()) {
          return res.status(403).json({ error: 'Temporary account expired' })
        }
      }

      const validPassword = await bcryptjs.compare(password, user.password)
      if (!validPassword) {
        // increment failed attempts
        await db.incrementFailedAttempts(user.id)
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // successful login: reset failed attempts and record activity
      await db.resetFailedAttempts(user.id)
      const forwardedIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null
      const remoteIp = req.socket?.remoteAddress || req.ip || '127.0.0.1'
      const ipAddress = forwardedIp || remoteIp
      const activityLocation = (req.body.location && req.body.location.trim()) || ipAddress || 'Unknown'
      await db.recordActivity({ userId: user.id, username: user.username, loginTime: new Date(), location: activityLocation, ipAddress, device: req.get('user-agent') || 'Unknown' })

      // gather stats for user
      const stats = await db.getUserStats(user.id)
      let messages = []
      if (user.isTemporary && user.expiresAt) {
        messages.push(`Temporary account until ${user.expiresAt}`)
      }
      if (user.lastRole && user.lastRole !== user.role) {
        messages.push(`Your role was changed to ${user.role}`)
        // update last_role so message only appears once
        await db.updateLastRole(user.id, user.role)
      }

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          loginAttempts: stats.loginAttempts,
          avgMouseMovements: stats.avgMouse,
          isTemporary: user.isTemporary,
          expiresAt: user.expiresAt,
          messages,
        }
      })
    }

    user = users.find(u => u.username === username)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.is_blocked) return res.status(403).json({ error: 'You are restricted by ADMIN please contact admin' })
    const validPassword = await bcryptjs.compare(password, user.password)
    if (!validPassword) {
      // increment in-memory failed attempts
      user.failedAttempts = (user.failedAttempts || 0) + 1
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Record login activity in-memory
    const activity = { id: activityIdCounter++, userId: user.id, username: user.username, loginTime: new Date().toISOString(), location: req.body.location || null, ipAddress: req.ip || '127.0.0.1', device: req.get('user-agent') || 'Unknown' }
    loginActivity.push(activity)

    // compute stats from in-memory stores
    const userActivities = loginActivity.filter(a => a.userId === user.id)
    const loginAttempts = userActivities.length
    const metricsForUser = userMetrics.filter(m => m.userId === user.id)
    const avgMouse = metricsForUser.length > 0 ? (metricsForUser.reduce((s,m)=>s+(m.mouseMovements||0),0)/metricsForUser.length) : 0
    const messages = []
    if (user.is_temporary || user.isTemporary) {
      messages.push('Temporary account')
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, loginAttempts, avgMouseMovements: Math.round(avgMouse), messages } })
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

// Admin routes
app.get('/admin/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    if (usingDB) {
      const rows = await db.getAllUsersWithCounts()
      return res.json(rows)
    }
    // in-memory response: include avg typing speed and avg mouse movements (computed)
    const rows = users.map(u => {
      const metricsForUser = userMetrics.filter(m => m.userId === u.id)
      const avgTyping = metricsForUser.length > 0 ? (metricsForUser.reduce((s, m) => s + (m.typingSpeed || 0), 0) / metricsForUser.length) : 0
      const avgMouse = metricsForUser.length > 0 ? (metricsForUser.reduce((s, m) => s + (m.mouseMovements || 0), 0) / metricsForUser.length) : 0
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isBlocked: !!u.is_blocked,
        failedAttempts: u.failedAttempts || 0,
        createdAt: u.created_at || null,
        isTemporary: !!u.is_temporary || !!u.isTemporary || false,
        expiresAt: u.expires_at || u.expiresAt || null,
        loginAttempts: loginActivity.filter(a => a.userId === u.id).length,
        avgTypingSpeed: Number(avgTyping.toFixed(2)),
        avgMouseMovements: Math.round(avgMouse)
      }
    })
    res.json(rows)
  } catch (err) {
    console.error('Admin users fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

app.post('/admin/users/:id/block', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    const { block } = req.body
    const userIdParam = req.params.id
    if (usingDB) {
      // when using a real database the id may be a string (MySQL returns numbers, keep general)
      await db.setUserBlocked(userIdParam, !!block)
      return res.json({ success: true })
    }
    const userId = Number(userIdParam)
    const target = users.find(u => u.id === userId)
    if (!target) return res.status(404).json({ error: 'User not found' })
    target.is_blocked = !!block
    res.json({ success: true })
  } catch (err) {
    console.error('Admin block error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Admin change role
app.post('/admin/users/:id/role', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    const { role } = req.body
    const userIdParam = req.params.id
    const allowed = ['admin', 'faculty', 'student']
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' })

    if (usingDB) {
      await db.updateUserRole(userIdParam, role)
      return res.json({ success: true })
    }

    const userId = Number(userIdParam)
    const target = users.find(u => u.id === userId)
    if (!target) return res.status(404).json({ error: 'User not found' })
    target.role = role
    res.json({ success: true })
  } catch (err) {
    console.error('Admin change role error:', err)
    res.status(500).json({ error: 'Failed to update role' })
  }
})

// Admin delete user
app.post('/admin/users/:id/delete', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    const userIdParam = req.params.id
    if (usingDB) {
      await db.deleteUser(userIdParam)
      return res.json({ success: true })
    }
    const userId = Number(userIdParam)
    const index = users.findIndex(u => u.id === userId)
    if (index === -1) return res.status(404).json({ error: 'User not found' })
    users.splice(index, 1)
    res.json({ success: true })
  } catch (err) {
    console.error('Admin delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Admin create user (including temporary accounts)
app.post('/admin/users/create', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    const { username, email, password, role = 'student', expiresAt } = req.body
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing required fields' })

    if (usingDB) {
      const existing = await db.getUserByUsername(username)
      if (existing) return res.status(400).json({ error: 'Username already exists' })
      const isTemporary = !!expiresAt
      const newUser = await db.createUser(username, email, password, role, expiresAt || null, isTemporary ? 1 : 0)
      return res.json({ success: true, user: newUser })
    }

    if (users.some(u => u.username === username)) return res.status(400).json({ error: 'Username already exists' })
    const hashed = await bcryptjs.hash(password, 10)
    const id = users.length + 1
    const newUser = { id, username, email, password: hashed, role, is_temporary: expiresAt ? 1 : 0, expires_at: expiresAt || null }
    users.push(newUser)
    res.json({ success: true, user: { id, username, email, role, isTemporary: !!expiresAt, expiresAt: expiresAt || null } })
  } catch (err) {
    console.error('Admin create user error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

app.get('/faculty/students', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ error: 'Faculty access required' })
    if (usingDB) {
      const rows = await db.getAllStudentsWithRecords()
      return res.json(rows)
    }
    const rows = users
      .filter(u => u.role === 'student')
      .map(u => {
        const record = studentRecords.find(r => r.userId === u.id)
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          marks: record?.marks || 'Not graded',
          subjectGrades: record?.subjectGrades || {},
          daysPresent: record?.daysPresent || 0,
          daysAbsent: record?.daysAbsent || 0,
        }
      })
    res.json(rows)
  } catch (err) {
    console.error('Faculty students fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch student records' })
  }
})

app.get('/student/record', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' })
    if (usingDB) {
      const record = await db.getStudentRecord(req.user.id)
      return res.json(record)
    }
    const record = studentRecords.find(r => r.userId === req.user.id)
    res.json({
      marks: record?.marks || 'Not graded',
      subjectGrades: record?.subjectGrades || {},
      daysPresent: record?.daysPresent || 0,
      daysAbsent: record?.daysAbsent || 0,
    })
  } catch (err) {
    console.error('Student record fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch student record' })
  }
})

app.get('/student/dashboard', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' })

    let dashboard = {
      studentId: req.user.id,
      studentName: req.user.username,
      marks: [],
      attendance: [],
      attendancePercent: 0,
      timetable: [],
      exams: [],
      notices: [],
      record: { marks: 'Not graded', daysPresent: 0, daysAbsent: 0 }
    }

    let activities = []
    if (usingDB) {
      dashboard = await db.getStudentDashboard(req.user.id)
      activities = await db.getActivitiesForUser(req.user.id)
    } else {
      const record = studentRecords.find(r => r.userId === req.user.id)
      dashboard.record = {
        marks: record?.marks || 'Not graded',
        subjectGrades: record?.subjectGrades || {},
        daysPresent: record?.daysPresent || 0,
        daysAbsent: record?.daysAbsent || 0
      }
      dashboard.subjectGrades = record?.subjectGrades || {}
      dashboard.attendancePercent = (dashboard.record.daysPresent + dashboard.record.daysAbsent) > 0
        ? Math.round((dashboard.record.daysPresent / (dashboard.record.daysPresent + dashboard.record.daysAbsent)) * 100)
        : 0
      activities = loginActivity.filter(a => a.userId === req.user.id).slice().sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))
    }

    dashboard.subjectGrades = dashboard.subjectGrades || dashboard.record?.subjectGrades || {}
    dashboard.marks = Object.keys(dashboard.subjectGrades)
    dashboard.attendance = [
      { subject: 'Mathematics', percent: 88 },
      { subject: 'Physics', percent: 92 },
      { subject: 'Chemistry', percent: 79 },
      { subject: 'English', percent: 95 }
    ]
    dashboard.timetable = [
      { time: '09:00 AM', class: 'Mathematics', location: 'Room 201' },
      { time: '10:30 AM', class: 'Physics', location: 'Lab 3' },
      { time: '12:00 PM', class: 'Chemistry', location: 'Room 207' },
      { time: '02:00 PM', class: 'English', location: 'Room 109' }
    ]
    dashboard.exams = [
      { date: '2026-04-15', subject: 'Mathematics', type: 'Midterm' },
      { date: '2026-04-22', subject: 'Physics', type: 'Internal' },
      { date: '2026-04-29', subject: 'Chemistry', type: 'External' }
    ]
    dashboard.notices = [
      'Schedule update: Physics lab moved to 10:30 AM on Thursday.',
      'Submit your Mathematics assignment by Friday.',
      'Remember to download the new syllabus from the portal.'
    ]

    const lastLoginActivity = activities[0]
    const lastLogin = lastLoginActivity ? {
      loginTime: lastLoginActivity.login_time || lastLoginActivity.loginTime,
      location: lastLoginActivity.location || 'Unknown'
    } : null

    const status = lastLogin && lastLogin.location !== 'Unknown' ? 'Secure' : 'Suspicious'
    return res.json({
      ...dashboard,
      studentName: req.user.username,
      lastLogin,
      status
    })
  } catch (err) {
    console.error('Student dashboard fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch student dashboard' })
  }
})

app.post('/faculty/students/:id/record', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ error: 'Faculty access required' })
    const studentId = Number(req.params.id)
    const { marks, subjectGrades, daysPresent, daysAbsent } = req.body
    if (Number.isNaN(studentId)) return res.status(400).json({ error: 'Invalid student id' })
    const presentValue = Number(daysPresent)
    const absentValue = Number(daysAbsent)
    if (daysPresent === undefined || Number.isNaN(presentValue) || presentValue < 0) {
      return res.status(400).json({ error: 'Days present must be a non-negative number' })
    }
    if (daysAbsent === undefined || Number.isNaN(absentValue) || absentValue < 0) {
      return res.status(400).json({ error: 'Days absent must be a non-negative number' })
    }

    if (usingDB) {
      await db.upsertStudentRecord(studentId, marks, presentValue, absentValue, subjectGrades)
      return res.json({ success: true })
    }

    const target = users.find(u => u.id === studentId && u.role === 'student')
    if (!target) return res.status(404).json({ error: 'Student not found' })
    const existing = studentRecords.find(r => r.userId === studentId)
    if (existing) {
      existing.marks = typeof marks === 'string' && marks.trim().length > 0 ? marks.trim() : 'Not graded'
      existing.subjectGrades = subjectGrades || existing.subjectGrades || {}
      existing.daysPresent = presentValue
      existing.daysAbsent = absentValue
      existing.updatedAt = new Date().toISOString()
    } else {
      studentRecords.push({
        id: studentRecordIdCounter++,
        userId: studentId,
        marks: typeof marks === 'string' && marks.trim().length > 0 ? marks.trim() : 'Not graded',
        subjectGrades: subjectGrades || {},
        daysPresent: presentValue,
        daysAbsent: absentValue,
        updatedAt: new Date().toISOString()
      })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Faculty update record error:', err)
    res.status(500).json({ error: 'Failed to update student record' })
  }
})

// Metrics endpoints
app.post('/metrics/record', verifyToken, async (req, res) => {
  try {
    const { typingSpeed, mouseMovements } = req.body
    if (!typingSpeed || !mouseMovements) return res.status(400).json({ error: 'Missing metrics' })
    
    if (usingDB) {
      await db.recordMetrics(req.user.id, req.user.username, typingSpeed, mouseMovements)
    } else {
      // in-memory: record metrics into a list so we can compute averages
      const metric = {
        id: metricsIdCounter++,
        userId: req.user.id,
        username: req.user.username,
        typingSpeed: Number(typingSpeed),
        mouseMovements: Number(mouseMovements),
        recordedAt: new Date().toISOString()
      }
      userMetrics.push(metric)
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Metrics error:', err)
    res.status(500).json({ error: 'Failed to record metrics' })
  }
})

app.get('/admin/stats/today-logins', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    
    if (usingDB) {
      const rows = await db.getTodayLoginStats()
      // fill in missing hours with 0
      const stats = Array(24).fill(0).map((_, hour) => ({
        hour,
        count: rows.find(r => r.hour === hour)?.count || 0
      }))
      return res.json(stats)
    }
    
    // in-memory: count logins by hour today
    const today = new Date().toDateString()
    const todayStats = Array(24).fill(0)
    loginActivity.forEach(a => {
      const actDate = new Date(a.loginTime).toDateString()
      if (actDate === today) {
        const hour = new Date(a.loginTime).getHours()
        todayStats[hour]++
      }
    })
    const stats = todayStats.map((count, hour) => ({ hour, count }))
    res.json(stats)
  } catch (err) {
    console.error('Today login stats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

app.get('/admin/stats/account-creation', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    
    if (usingDB) {
      const rows = await db.getAccountCreationStats()
      return res.json(rows)
    }
    
    // in-memory: approximate using users created_at (if available)
    const stats = {}
    users.forEach(u => {
      const date = u.created_at || new Date().toISOString().split('T')[0]
      const key = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0]
      stats[key] = (stats[key] || 0) + 1
    })
    const result = Object.entries(stats).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date) - new Date(b.date))
    res.json(result)
  } catch (err) {
    console.error('Account creation stats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Notice Board Routes
app.post('/faculty/notice', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ error: 'Faculty access required' })
    const { title, message } = req.body
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' })

    if (usingDB) {
      await db.createNotice(title, message, req.user.id)
    } else {
      // in-memory fallback
      const notice = {
        id: Date.now(),
        title,
        message,
        postedBy: req.user.id,
        postedByName: req.user.username,
        createdAt: new Date().toISOString()
      }
      notices.push(notice)
    }
    res.json({ success: true, message: 'Notice posted successfully' })
  } catch (error) {
    console.error('Post notice error:', error)
    res.status(500).json({ error: 'Failed to post notice' })
  }
})

app.get('/notices', verifyToken, async (req, res) => {
  try {
    if (usingDB) {
      const notices = await db.getAllNotices()
      return res.json(notices)
    }
    // in-memory: return current notices
    res.json(notices)
  } catch (error) {
    console.error('Get notices error:', error)
    res.status(500).json({ error: 'Failed to fetch notices' })
  }
})

// Marks Routes
app.post('/faculty/marks', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ error: 'Faculty access required' })
    const { studentId, subject, marks } = req.body
    if (!studentId || !subject || !marks) return res.status(400).json({ error: 'Student ID, subject, and marks are required' })

    if (usingDB) {
      await db.assignMarks(studentId, subject, marks, req.user.id)
    } else {
      // in-memory fallback - could add to studentRecords
    }
    res.json({ success: true, message: 'Marks assigned successfully' })
  } catch (error) {
    console.error('Assign marks error:', error)
    res.status(500).json({ error: 'Failed to assign marks' })
  }
})

app.get('/student/marks', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' })

    if (usingDB) {
      const marks = await db.getStudentMarks(req.user.id)
      return res.json(marks)
    }
    // in-memory: return from studentRecords
    const record = studentRecords.find(r => r.userId === req.user.id)
    const marks = record?.subjectGrades || {}
    res.json(marks)
  } catch (error) {
    console.error('Get student marks error:', error)
    res.status(500).json({ error: 'Failed to fetch marks' })
  }
})

// Attendance Routes
app.post('/faculty/attendance', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') return res.status(403).json({ error: 'Faculty access required' })
    const { studentId, totalDays, presentDays } = req.body
    const studentIdNumber = Number(studentId)
    const totalDaysNumber = Number(totalDays)
    const presentDaysNumber = Number(presentDays)

    if (Number.isNaN(studentIdNumber) || totalDays === undefined || presentDays === undefined) {
      return res.status(400).json({ error: 'Student ID, total days, and present days are required' })
    }
    if (Number.isNaN(totalDaysNumber) || Number.isNaN(presentDaysNumber) || totalDaysNumber < 0 || presentDaysNumber < 0) {
      return res.status(400).json({ error: 'Attendance values must be non-negative numbers' })
    }
    if (presentDaysNumber > totalDaysNumber) return res.status(400).json({ error: 'Present days cannot exceed total days' })

    if (usingDB) {
      await db.updateAttendance(studentIdNumber, totalDaysNumber, presentDaysNumber, req.user.id)
    } else {
      // in-memory: update studentRecords
      const record = studentRecords.find(r => r.userId === studentIdNumber)
      if (record) {
        record.daysPresent = presentDaysNumber
        record.daysAbsent = totalDaysNumber - presentDaysNumber
        record.updatedAt = new Date().toISOString()
      }
    }
    res.json({ success: true, message: 'Attendance updated successfully' })
  } catch (error) {
    console.error('Update attendance error:', error)
    res.status(500).json({ error: 'Failed to update attendance' })
  }
})

app.get('/student/attendance', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' })

    if (usingDB) {
      const attendance = await db.getStudentAttendance(req.user.id)
      return res.json(attendance)
    }
    // in-memory
    const record = studentRecords.find(r => r.userId === req.user.id)
    const attendance = record ? {
      totalDays: record.daysPresent + record.daysAbsent,
      presentDays: record.daysPresent,
      absentDays: record.daysAbsent,
      percentage: record.daysPresent + record.daysAbsent > 0 ? Math.round((record.daysPresent / (record.daysPresent + record.daysAbsent)) * 100) : 0
    } : { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 }
    res.json(attendance)
  } catch (error) {
    console.error('Get student attendance error:', error)
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
})

// Report Card Route
app.get('/student/report', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student access required' })

    if (usingDB) {
      const report = await db.getStudentReport(req.user.id)
      return res.json(report)
    }
    // in-memory
    const record = studentRecords.find(r => r.userId === req.user.id)
    const report = {
      studentId: req.user.id,
      studentName: req.user.username,
      marks: record?.subjectGrades || {},
      attendance: {
        totalDays: record ? record.daysPresent + record.daysAbsent : 0,
        presentDays: record?.daysPresent || 0,
        absentDays: record?.daysAbsent || 0,
        percentage: record && record.daysPresent + record.daysAbsent > 0 ? Math.round((record.daysPresent / (record.daysPresent + record.daysAbsent)) * 100) : 0
      },
      status: 'Pass' // Simple logic, can be enhanced
    }
    res.json(report)
  } catch (error) {
    console.error('Get student report error:', error)
    res.status(500).json({ error: 'Failed to fetch report' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' })
})

// Start server with error handler for address-in-use
const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
  console.log(`\nDefault accounts:`)
  console.log(`Admin - username: admin, password: admin123`)
  console.log(`User - username: user1, password: user123`)
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Another process is listening on this port.`)
    console.error('Use a different PORT in .env (e.g. PORT=5001) or stop the process using this port.')
    process.exit(1)
  }
  console.error('Server error:', err)
  process.exit(1)
})
