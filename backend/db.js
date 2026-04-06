import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

let pool = null

async function initDB() {
  try {
    if (!pool) {
      pool = await mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '132007',
        database: process.env.DB_NAME || 'simply_safe',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    }

    // ensure tables exist
    const columnExists = async (table, column) => {
      if (!pool) return false
      try {
        const [rows] = await pool.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column])
        return rows.length > 0
      } catch (err) {
        return false
      }
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          password VARCHAR(255) NOT NULL,
          role ENUM('admin','faculty','student') DEFAULT 'student',
          last_role VARCHAR(255) DEFAULT 'student',
          is_blocked BOOLEAN DEFAULT FALSE,
          failed_attempts INT DEFAULT 0,
          is_temporary BOOLEAN DEFAULT FALSE,
          expires_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_username (username),
          INDEX idx_role (role)
        )`
    )

    if (!(await columnExists('users', 'last_role'))) {
      await pool.query("ALTER TABLE users ADD COLUMN last_role VARCHAR(255) DEFAULT 'student'")
    }
    if (!(await columnExists('users', 'is_temporary'))) {
      await pool.query('ALTER TABLE users ADD COLUMN is_temporary BOOLEAN DEFAULT FALSE')
    }
    if (!(await columnExists('users', 'expires_at'))) {
      await pool.query('ALTER TABLE users ADD COLUMN expires_at DATETIME NULL')
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS login_activity (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          username VARCHAR(255),
          login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          location VARCHAR(255) NULL,
          ip_address VARCHAR(255),
          device VARCHAR(255),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_user_id (user_id),
          INDEX idx_login_time (login_time)
        )`
    )

    await pool.query(
      `CREATE TABLE IF NOT EXISTS user_metrics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          username VARCHAR(255),
          typing_speed DOUBLE,
          mouse_movements INT,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_user_id (user_id),
          INDEX idx_recorded_at (recorded_at)
        )`
    )

    await pool.query(
      `CREATE TABLE IF NOT EXISTS student_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE,
          marks VARCHAR(255) DEFAULT 'Not graded',
          subject_marks TEXT DEFAULT NULL,
          grade VARCHAR(10) DEFAULT NULL,
          days_present INT DEFAULT 0,
          days_absent INT DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        )`
    )

    if (!(await columnExists('student_records', 'days_present'))) {
      await pool.query('ALTER TABLE student_records ADD COLUMN days_present INT DEFAULT 0')
    }
    if (!(await columnExists('student_records', 'days_absent'))) {
      await pool.query('ALTER TABLE student_records ADD COLUMN days_absent INT DEFAULT 0')
    }
    if (!(await columnExists('student_records', 'subject_marks'))) {
      await pool.query('ALTER TABLE student_records ADD COLUMN subject_marks TEXT NULL')
    }
    if (!(await columnExists('student_records', 'grade'))) {
      await pool.query('ALTER TABLE student_records ADD COLUMN grade VARCHAR(10) NULL')
    }

    await pool.query(
      `CREATE TABLE IF NOT EXISTS notices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          posted_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_posted_by (posted_by),
          INDEX idx_created_at (created_at)
        )`
    )

    await pool.query(
      `CREATE TABLE IF NOT EXISTS marks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          subject VARCHAR(255) NOT NULL,
          marks VARCHAR(50) NOT NULL,
          assigned_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_student_id (student_id),
          INDEX idx_subject (subject),
          INDEX idx_assigned_by (assigned_by)
        )`
    )

    await pool.query(
      `CREATE TABLE IF NOT EXISTS attendance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          total_days INT NOT NULL,
          present_days INT NOT NULL,
          absent_days INT DEFAULT 0,
          updated_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_student_id (student_id),
          INDEX idx_updated_by (updated_by),
          UNIQUE KEY unique_student (student_id)
        )`
    )

    if (!(await columnExists('attendance', 'absent_days'))) {
      await pool.query('ALTER TABLE attendance ADD COLUMN absent_days INT DEFAULT 0')
    }

    // ensure older schemas are migrated to new attendance and grade/subject fields
    try {
      await pool.query('ALTER TABLE student_records ADD COLUMN IF NOT EXISTS days_present INT DEFAULT 0')
    } catch (e) {
      // ignore if not supported
    }
    try {
      await pool.query('ALTER TABLE student_records ADD COLUMN IF NOT EXISTS days_absent INT DEFAULT 0')
    } catch (e) {
      // ignore if not supported
    }
    try {
      await pool.query('ALTER TABLE student_records ADD COLUMN IF NOT EXISTS subject_marks TEXT NULL')
    } catch (e) {
      // ignore if not supported
    }
    try {
      await pool.query('ALTER TABLE student_records ADD COLUMN IF NOT EXISTS grade VARCHAR(10) NULL')
    } catch (e) {
      // ignore if not supported
    }

    // seed demo users if none exist
    const [adminRows] = await pool.query('SELECT id FROM users WHERE username = ?', ['admin'])
    if (adminRows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10)
      await pool.query('INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)', [
        'admin',
        'admin@example.com',
        hash,
        'admin',
      ])
      console.log('Seeded admin user (admin / admin123)')
    }

    const demoStudents = [
      { username: 'student1', email: 'student1@example.com', password: 'student123' },
      { username: 'student2', email: 'student2@example.com', password: 'student234' },
      { username: 'student3', email: 'student3@example.com', password: 'student345' }
    ]

    for (const student of demoStudents) {
      const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [student.username])
      if (rows.length === 0) {
        const hash = await bcrypt.hash(student.password, 10)
        const [result] = await pool.query('INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)', [
          student.username,
          student.email,
          hash,
          'student',
        ])
        await pool.query('INSERT INTO student_records (user_id, marks, days_present, days_absent) VALUES (?,?,?,?)', [result.insertId, 'Not graded', 0, 0])
        console.log(`Seeded student user (${student.username} / ${student.password})`)
      }
    }

    const [facultyRows] = await pool.query('SELECT id FROM users WHERE username = ?', ['faculty1'])
    if (facultyRows.length === 0) {
      const hash = await bcrypt.hash('faculty123', 10)
      await pool.query('INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)', [
        'faculty1',
        'faculty1@example.com',
        hash,
        'faculty',
      ])
      console.log('Seeded faculty user (faculty1 / faculty123)')
    }

    return pool
  } catch (err) {
    console.error('MySQL init error:', err)
    return null
  }
}

async function getUserByUsername(username) {
  if (!pool) return null
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
  if (rows.length === 0) return null
  const u = rows[0]
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    password: u.password,
    role: u.role,
    lastRole: u.last_role,
    isBlocked: !!u.is_blocked,
    failedAttempts: u.failed_attempts,
    isTemporary: !!u.is_temporary,
    expiresAt: u.expires_at,
  }
}

async function createUser(username, email, password, role = 'student', expiresAt = null, isTemporary = 0) {
  if (!pool) return null
  const hash = await bcrypt.hash(password, 10)
  // Insert minimal columns (older schemas may not have the newer columns)
  const [result] = await pool.query(
    'INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)',
    [username, email, hash, role]
  )

  // Try to set newer columns if they exist; ignore errors for older schemas
  try {
    await pool.query('UPDATE users SET last_role = ? WHERE id = ?', [role, result.insertId])
  } catch (e) {
    // ignore
  }
  try {
    if (isTemporary) {
      await pool.query('UPDATE users SET is_temporary = ?, expires_at = ? WHERE id = ?', [!!isTemporary, expiresAt || null, result.insertId])
    }
  } catch (e) {
    // ignore
  }

  return { id: result.insertId, username, email, role, isBlocked: false, failedAttempts: 0 }
}

async function recordActivity(entry) {
  if (!pool) return null
  const { userId, username, loginTime, ipAddress, device, location } = entry
  const [result] = await pool.query(
    'INSERT INTO login_activity (user_id,username,login_time,location,ip_address,device) VALUES (?,?,?,?,?,?)',
    [userId, username, loginTime || new Date(), location || null, ipAddress, device]
  )
  return result.insertId
}

async function incrementFailedAttempts(userId) {
  if (!pool) return null
  await pool.query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?', [userId])
}

async function resetFailedAttempts(userId) {
  if (!pool) return null
  await pool.query('UPDATE users SET failed_attempts = 0 WHERE id = ?', [userId])
}

async function setUserBlocked(userId, blocked) {
  if (!pool) return null
  await pool.query('UPDATE users SET is_blocked = ? WHERE id = ?', [blocked ? 1 : 0, userId])
}

async function updateUserRole(userId, newRole) {
  if (!pool) return null
  // basic validation for allowed roles
  const allowed = ['admin', 'faculty','student']
  if (!allowed.includes(newRole)) throw new Error('Invalid role')
  await pool.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId])
}

async function updateLastRole(userId, role) {
  if (!pool) return null
  await pool.query('UPDATE users SET last_role = ? WHERE id = ?', [role, userId])
}

async function getUserStats(userId) {
  if (!pool) return { loginAttempts: 0, avgMouse: 0 }
  const [loginRows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM login_activity WHERE user_id = ?',
    [userId]
  )
  const [mouseRows] = await pool.query(
    'SELECT AVG(mouse_movements) AS avg_mouse FROM user_metrics WHERE user_id = ?',
    [userId]
  )
  return {
    loginAttempts: loginRows[0]?.cnt || 0,
    avgMouse: mouseRows[0]?.avg_mouse || 0,
  }
}

async function getAllStudentsWithRecords() {
  if (!pool) return []
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email, u.role,
            COALESCE(r.marks, 'Not graded') AS marks,
            COALESCE(r.days_present, 0) AS daysPresent,
            COALESCE(r.days_absent, 0) AS daysAbsent,
            r.subject_marks AS subjectGrades
     FROM users u
     LEFT JOIN student_records r ON r.user_id = u.id
     WHERE u.role = 'student'
     ORDER BY u.username ASC`
  )
  return rows.map(r => {
    let parsedGrades = {}
    if (r.subjectGrades) {
      try {
        parsedGrades = typeof r.subjectGrades === 'object' ? r.subjectGrades : JSON.parse(r.subjectGrades)
      } catch (e) {
        parsedGrades = {}
      }
    }
    return {
      id: r.id,
      username: r.username,
      email: r.email,
      role: r.role,
      marks: r.marks,
      daysPresent: Number(r.daysPresent),
      daysAbsent: Number(r.daysAbsent),
      subjectGrades: parsedGrades
    }
  })
}

async function getStudentRecord(userId) {
  if (!pool) return { marks: 'Not graded', daysPresent: 0, daysAbsent: 0, subjectGrades: {} }
  const [rows] = await pool.query(
    'SELECT marks, days_present, days_absent, subject_marks AS subjectGrades FROM student_records WHERE user_id = ?',
    [userId]
  )
  if (rows.length === 0) return { marks: 'Not graded', daysPresent: 0, daysAbsent: 0, subjectGrades: {} }
  let parsedGrades = {}
  if (rows[0].subjectGrades) {
    try {
      parsedGrades = typeof rows[0].subjectGrades === 'object' ? rows[0].subjectGrades : JSON.parse(rows[0].subjectGrades)
    } catch (e) {
      parsedGrades = {}
    }
  }
  return {
    marks: rows[0].marks || 'Not graded',
    daysPresent: Number(rows[0].days_present || 0),
    daysAbsent: Number(rows[0].days_absent || 0),
    subjectGrades: parsedGrades
  }
}

async function upsertStudentRecord(userId, marks, daysPresent, daysAbsent, subjectGrades = {}) {
  if (!pool) return null
  const marksValue = typeof marks === 'string' && marks.trim().length > 0 ? marks.trim() : 'Not graded'
  const presentValue = Number.isFinite(Number(daysPresent)) ? Number(daysPresent) : 0
  const absentValue = Number.isFinite(Number(daysAbsent)) ? Number(daysAbsent) : 0
  const subjectGradesValue = typeof subjectGrades === 'object' ? JSON.stringify(subjectGrades) : null
  const [result] = await pool.query(
    `INSERT INTO student_records (user_id, marks, days_present, days_absent, subject_marks)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE marks = VALUES(marks), days_present = VALUES(days_present), days_absent = VALUES(days_absent), subject_marks = VALUES(subject_marks), updated_at = CURRENT_TIMESTAMP`,
    [userId, marksValue, presentValue, absentValue, subjectGradesValue]
  )
  return result.insertId || null
}

async function getStudentDashboard(userId) {
  const record = await getStudentRecord(userId)
  const attendancePercent = record.daysPresent + record.daysAbsent > 0
    ? Math.round((record.daysPresent / (record.daysPresent + record.daysAbsent)) * 100)
    : 0

  const subjectGrades = record.subjectGrades || {}
  const marks = Object.keys(subjectGrades)

  const attendance = [
    { subject: 'Mathematics', percent: 88 },
    { subject: 'Physics', percent: 92 },
    { subject: 'Chemistry', percent: 79 },
    { subject: 'English', percent: 95 }
  ]

  const timetable = [
    { time: '09:00 AM', class: 'Mathematics', location: 'Room 201' },
    { time: '10:30 AM', class: 'Physics', location: 'Lab 3' },
    { time: '12:00 PM', class: 'Chemistry', location: 'Room 207' },
    { time: '02:00 PM', class: 'English', location: 'Room 109' }
  ]

  const exams = [
    { date: '2026-04-15', subject: 'Mathematics', type: 'Midterm' },
    { date: '2026-04-22', subject: 'Physics', type: 'Internal' },
    { date: '2026-04-29', subject: 'Chemistry', type: 'External' }
  ]

  const notices = [
    'Schedule update: Physics lab moved to 10:30 AM on Thursday.',
    'Submit your Mathematics assignment by Friday.',
    'Remember to download the new syllabus from the portal.'
  ]

  return {
    studentId: userId,
    marks,
    subjectGrades,
    attendance,
    attendancePercent,
    timetable,
    exams,
    notices,
    record
  }
}

async function deleteUser(userId) {
  if (!pool) return null
  // Use a transaction in case there are related metrics/activity; for simplicity just delete
  await pool.query('DELETE FROM users WHERE id = ?', [userId])
}

async function getAllUsersWithCounts() {
  if (!pool) return []
  const query = `
    SELECT u.*, 
           COALESCE(l.login_count,0) AS loginAttempts,
           COALESCE(m.avg_typing,0) AS avgTypingSpeed,
           COALESCE(m.avg_mouse,0) AS avgMouseMovements
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS login_count
      FROM login_activity
      GROUP BY user_id
    ) l ON l.user_id = u.id
    LEFT JOIN (
      SELECT user_id,
             AVG(typing_speed) AS avg_typing,
             AVG(mouse_movements) AS avg_mouse
      FROM user_metrics
      GROUP BY user_id
    ) m ON m.user_id = u.id
    ORDER BY u.created_at DESC
  `
  const [rows] = await pool.query(query)
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    email: r.email,
    role: r.role,
    lastRole: r.last_role,
    isBlocked: !!r.is_blocked,
    failedAttempts: r.failed_attempts,
    createdAt: r.created_at,
    loginAttempts: r.loginAttempts,
    avgTypingSpeed: Number(r.avgTypingSpeed.toFixed(2)),
    avgMouseMovements: Math.round(r.avgMouseMovements),
    isTemporary: !!r.is_temporary,
    expiresAt: r.expires_at,
  }))
}

async function recordMetrics(userId, username, typingSpeed, mouseMovements) {
  if (!pool) return null
  const [result] = await pool.query(
    'INSERT INTO user_metrics (user_id,username,typing_speed,mouse_movements) VALUES (?,?,?,?)',
    [userId, username, typingSpeed, mouseMovements]
  )
  return result.insertId
}

async function getTodayLoginStats() {
  if (!pool) return []
  const start = new Date()
  start.setHours(0,0,0,0)
  const [rows] = await pool.query(
    `SELECT HOUR(login_time) AS hour, COUNT(*) AS count
     FROM login_activity
     WHERE login_time >= ?
     GROUP BY HOUR(login_time)`,
    [start]
  )
  return rows.map(r => ({ hour: r.hour, count: r.count }))
}

async function getAccountCreationStats() {
  if (!pool) return []
  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0,0,0,0)
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS count
     FROM users
     WHERE created_at >= ?
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [since]
  )
  return rows
}

async function getActivitiesForUser(userId) {
  if (!pool) return []
  const [rows] = await pool.query(
    `SELECT * FROM login_activity WHERE user_id = ? ORDER BY login_time DESC`,
    [userId]
  )
  return rows
}

async function getAllActivities() {
  if (!pool) return []
  const [rows] = await pool.query(`SELECT * FROM login_activity ORDER BY login_time DESC`)
  return rows
}

async function createNotice(title, message, postedBy) {
  if (!pool) return null
  const [result] = await pool.query(
    'INSERT INTO notices (title, message, posted_by) VALUES (?, ?, ?)',
    [title, message, postedBy]
  )
  return result.insertId
}

async function getAllNotices() {
  if (!pool) return []
  const [rows] = await pool.query(
    `SELECT n.*, u.username AS postedByName FROM notices n
     JOIN users u ON n.posted_by = u.id
     ORDER BY n.created_at DESC`
  )
  return rows
}

async function assignMarks(studentId, subject, marks, assignedBy) {
  if (!pool) return null
  const [result] = await pool.query(
    'INSERT INTO marks (student_id, subject, marks, assigned_by) VALUES (?, ?, ?, ?)',
    [studentId, subject, marks, assignedBy]
  )
  return result.insertId
}

async function getStudentMarks(userId) {
  if (!pool) return {}
  const [rows] = await pool.query(
    'SELECT subject, marks FROM marks WHERE student_id = ? ORDER BY created_at DESC',
    [userId]
  )
  const marks = {}
  rows.forEach(row => {
    marks[row.subject] = row.marks
  })
  return marks
}

async function updateAttendance(studentId, totalDays, presentDays, updatedBy) {
  if (!pool) return null
  const [result] = await pool.query(
    `INSERT INTO attendance (student_id, total_days, present_days, updated_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE total_days = VALUES(total_days), present_days = VALUES(present_days), updated_by = VALUES(updated_by), created_at = CURRENT_TIMESTAMP`,
    [studentId, totalDays, presentDays, updatedBy]
  )
  return result.insertId
}

async function getStudentAttendance(userId) {
  if (!pool) return { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 }
  const [rows] = await pool.query(
    'SELECT total_days, present_days, absent_days FROM attendance WHERE student_id = ?',
    [userId]
  )
  if (rows.length === 0) return { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 }
  const row = rows[0]
  const totalDays = Number(row.total_days)
  const presentDays = Number(row.present_days)
  const absentDays = Number.isFinite(Number(row.absent_days))
    ? Number(row.absent_days)
    : Math.max(0, totalDays - presentDays)
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
  return { totalDays, presentDays, absentDays, percentage }
}

async function getStudentReport(userId) {
  if (!pool) return { studentId: userId, marks: {}, attendance: { totalDays: 0, presentDays: 0, absentDays: 0, percentage: 0 }, status: 'Pass' }
  const marks = await getStudentMarks(userId)
  const attendance = await getStudentAttendance(userId)
  const [userRows] = await pool.query('SELECT username FROM users WHERE id = ?', [userId])
  const studentName = userRows.length > 0 ? userRows[0].username : 'Unknown'
  return {
    studentId: userId,
    studentName,
    marks,
    attendance,
    status: 'Pass' // Simple logic
  }
}

export default {
  initDB,
  getUserByUsername,
  createUser,
  recordActivity,
  getActivitiesForUser,
  getAllActivities,
  incrementFailedAttempts,
  resetFailedAttempts,
  setUserBlocked,
  getAllUsersWithCounts,
  recordMetrics,
  getTodayLoginStats,
  getAccountCreationStats,
  getPool: () => pool,
  updateUserRole,
  deleteUser,
  getUserStats,
  getAllStudentsWithRecords,
  getStudentRecord,
  upsertStudentRecord,
  getStudentDashboard,
  updateLastRole,
  createNotice,
  getAllNotices,
  assignMarks,
  getStudentMarks,
  updateAttendance,
  getStudentAttendance,
  getStudentReport,
}