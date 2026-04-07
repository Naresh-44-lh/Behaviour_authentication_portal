import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import '../styles/Activity.css'

const FacultyPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)

  // Notice board state
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [postingNotice, setPostingNotice] = useState(false)

  // Marks assignment state
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [marksValue, setMarksValue] = useState('')
  const [assigningMarks, setAssigningMarks] = useState(false)

  // Attendance state
  const [attendanceStudent, setAttendanceStudent] = useState('')
  const [totalDays, setTotalDays] = useState('')
  const [presentDays, setPresentDays] = useState('')
  const [updatingAttendance, setUpdatingAttendance] = useState(false)

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'English']
  const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'FAIL']

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get('/_/backend/faculty/students')
      setStudents(response.data)
      setEdits({})
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load student records')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  const handleEditChange = (id, field, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      }
    }))
  }

  const getCurrentValue = (student, field) => {
    if (edits[student.id]?.[field] !== undefined) return edits[student.id][field]
    if (student.subjectGrades && Object.prototype.hasOwnProperty.call(student.subjectGrades, field)) {
      return student.subjectGrades[field] ?? ''
    }
    return student[field] !== undefined ? student[field] : ''
  }

  const handleScrollWheel = (event) => {
    const container = event.currentTarget
    if (container.scrollWidth > container.clientWidth) {
      container.scrollLeft += event.deltaY
      event.preventDefault()
    }
  }

  const updateStudentRecord = async (student) => {
    const edit = edits[student.id] || {}
    const existingGrades = student.subjectGrades || {}
    const subjectGrades = {}

    subjects.forEach(subject => {
      const updatedValue = edit[subject] !== undefined ? edit[subject] : existingGrades[subject]
      if (updatedValue) subjectGrades[subject] = updatedValue
    })

    const daysPresent = edit.daysPresent !== undefined ? edit.daysPresent : student.daysPresent
    const daysAbsent = edit.daysAbsent !== undefined ? edit.daysAbsent : student.daysAbsent

    const numericPresent = Number(daysPresent)
    const numericAbsent = Number(daysAbsent)
    if (Number.isNaN(numericPresent) || numericPresent < 0) {
      setError('Days present must be a non-negative number')
      return
    }
    if (Number.isNaN(numericAbsent) || numericAbsent < 0) {
      setError('Days absent must be a non-negative number')
      return
    }

    const allowedGrades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'FAIL']
    const invalidGrade = Object.values(subjectGrades).find(v => v && !allowedGrades.includes(v))
    if (invalidGrade) {
      setError('Each subject grade must be one of A+, A, B+, B, C+, C or FAIL')
      return
    }

    const marksSummary = subjects.map(subject => `${subject}: ${subjectGrades[subject] || '—'}`).join(', ')

    try {
      setSavingId(student.id)
      setError('')
      await axios.post(`/_/backend/faculty/students/${student.id}/record`, {
        marks: marksSummary,
        subjectGrades,
        daysPresent: numericPresent,
        daysAbsent: numericAbsent,
      })
      await fetchStudents()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update student record')
    } finally {
      setSavingId(null)
    }
  }

  const postNotice = async () => {
    if (!noticeTitle.trim() || !noticeMessage.trim()) {
      setError('Title and message are required')
      return
    }

    try {
      setPostingNotice(true)
      setError('')
      await axios.post('/_/backend/faculty/notice', {
        title: noticeTitle.trim(),
        message: noticeMessage.trim()
      })
      setNoticeTitle('')
      setNoticeMessage('')
      setError('Notice posted successfully!')
      setTimeout(() => setError(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post notice')
    } finally {
      setPostingNotice(false)
    }
  }

  const assignMarks = async () => {
    if (!selectedStudent || !selectedSubject || !marksValue.trim()) {
      setError('Please select student, subject, and enter marks')
      return
    }

    try {
      setAssigningMarks(true)
      setError('')
      await axios.post('/_/backend/faculty/marks', {
        studentId: selectedStudent,
        subject: selectedSubject,
        marks: marksValue.trim()
      })
      setSelectedStudent('')
      setSelectedSubject('')
      setMarksValue('')
      setError('Marks assigned successfully!')
      setTimeout(() => setError(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign marks')
    } finally {
      setAssigningMarks(false)
    }
  }

  const updateAttendance = async () => {
    if (!attendanceStudent || !totalDays || !presentDays) {
      setError('Please select student and enter attendance details')
      return
    }

    const total = Number(totalDays)
    const present = Number(presentDays)
    if (isNaN(total) || total < 0 || isNaN(present) || present < 0 || present > total) {
      setError('Invalid attendance values')
      return
    }

    try {
      setUpdatingAttendance(true)
      setError('')
      await axios.post('/_/backend/faculty/attendance', {
        studentId: attendanceStudent,
        totalDays: total,
        presentDays: present
      })
      setAttendanceStudent('')
      setTotalDays('')
      setPresentDays('')
      setError('Attendance updated successfully!')
      setTimeout(() => setError(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update attendance')
    } finally {
      setUpdatingAttendance(false)
    }
  }

  if (!user) return null
  if (user.role !== 'faculty' && user.role !== 'admin') {
    return (
      <div className="activity-container">
        <div className="activity-header">
          <h1>Faculty Access Required</h1>
        </div>
        <div className="error-message">You do not have permission to view this page.</div>
      </div>
    )
  }

  return (
    <div className="activity-container">
      <div className="activity-header">
        <div>
          <h1>Faculty Dashboard</h1>
          <p style={{ margin: 0, color: '#555' }}>
            Manage notices, assign marks, update attendance, and view student records.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchStudents} className="refresh-btn">
            ↻ Refresh
          </button>
          <button onClick={handleBack} className="refresh-btn" style={{ background: 'linear-gradient(135deg, #555 0%, #333 100%)' }}>
            Back to Dashboard
          </button>
          <button onClick={handleLogout} className="refresh-btn" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' }}>
            Logout
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Notice Board Form */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#1e3c72' }}>📢 Post Notice</h2>
        <div style={{ display: 'grid', gap: '12px', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Notice Title"
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          />
          <textarea
            placeholder="Notice Message"
            value={noticeMessage}
            onChange={(e) => setNoticeMessage(e.target.value)}
            rows={4}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7', resize: 'vertical' }}
          />
          <button
            onClick={postNotice}
            disabled={postingNotice}
            style={{ padding: '12px 24px', background: '#1e3c72', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {postingNotice ? 'Posting...' : 'Post Notice'}
          </button>
        </div>
      </div>

      {/* Marks Assignment Form */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#1e3c72' }}>📝 Assign Marks</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '800px' }}>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          >
            <option value="">Select Student</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>{student.username}</option>
            ))}
          </select>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          >
            <option value="">Select Subject</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Marks (e.g., A+, 85, ABSENT)"
            value={marksValue}
            onChange={(e) => setMarksValue(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          />
          <button
            onClick={assignMarks}
            disabled={assigningMarks}
            style={{ padding: '12px 24px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {assigningMarks ? 'Assigning...' : 'Assign Marks'}
          </button>
        </div>
      </div>

      {/* Attendance Update Form */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#1e3c72' }}>📊 Update Attendance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '800px' }}>
          <select
            value={attendanceStudent}
            onChange={(e) => setAttendanceStudent(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          >
            <option value="">Select Student</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>{student.username}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Total Days"
            value={totalDays}
            onChange={(e) => setTotalDays(e.target.value)}
            min="0"
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          />
          <input
            type="number"
            placeholder="Present Days"
            value={presentDays}
            onChange={(e) => setPresentDays(e.target.value)}
            min="0"
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
          />
          <button
            onClick={updateAttendance}
            disabled={updatingAttendance}
            style={{ padding: '12px 24px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {updatingAttendance ? 'Updating...' : 'Update Attendance'}
          </button>
        </div>
      </div>

      <div className="activity-table-wrapper">
        {loading ? (
          <div className="loading">Loading student records...</div>
        ) : students.length === 0 ? (
          <div className="no-data">No students found</div>
        ) : (
          <div className="activity-scroll-container" onWheel={handleScrollWheel}>
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Mathematics</th>
                  <th>Physics</th>
                  <th>Chemistry</th>
                  <th>English</th>
                  <th>Days Present</th>
                  <th>Days Absent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id}>
                    <td><strong>{student.username}</strong></td>
                    <td>{student.email}</td>
                    {subjects.map(subject => (
                      <td key={subject}>
                        <select
                          value={getCurrentValue(student, subject)}
                          onChange={(e) => handleEditChange(student.id, subject, e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dcdfe7', background: 'white' }}
                        >
                          <option value="">Select grade</option>
                          {grades.map(gradeOption => (
                            <option key={gradeOption} value={gradeOption}>{gradeOption}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td>
                      <input
                        value={getCurrentValue(student, 'daysPresent')}
                        onChange={(e) => handleEditChange(student.id, 'daysPresent', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
                        placeholder="Days present"
                      />
                    </td>
                    <td>
                      <input
                        value={getCurrentValue(student, 'daysAbsent')}
                        onChange={(e) => handleEditChange(student.id, 'daysAbsent', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dcdfe7' }}
                        placeholder="Days absent"
                      />
                    </td>
                    <td className="user-actions">
                      <button
                        className="action-btn btn-edit"
                        disabled={savingId === student.id}
                        onClick={() => updateStudentRecord(student)}
                      >
                        {savingId === student.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacultyPage
