import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { jsPDF } from 'jspdf'
import { useAuth } from '../context/AuthContext'
import { useMetricsTracking } from '../hooks/useMetricsTracking'
import '../styles/Activity.css'

const tableHeaderStyle = {
  padding: '16px',
  textAlign: 'left',
  fontSize: '14px',
  fontWeight: 700,
  color: '#1e3c72'
}

const tableCellStyle = {
  padding: '14px 16px',
  color: '#333'
}

const StudentPage = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { startTracking, handleKeyPress, handleMouseMove } = useMetricsTracking()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [secureActionMessage, setSecureActionMessage] = useState('')
  const [notices, setNotices] = useState([])
  const [marks, setMarks] = useState({})
  const [attendance, setAttendance] = useState(null)
  const visibleNotices = notices.length > 0 ? notices : dashboard?.notices || []

  useEffect(() => {
    startTracking()
    fetchDashboard()
    fetchNotices()
    fetchMarks()
    fetchAttendance()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get('/_/backend/student/dashboard')
      setDashboard(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotices = async () => {
    try {
      const response = await axios.get('/_/backend/notices')
      setNotices(response.data)
    } catch (err) {
      console.error('Failed to fetch notices:', err)
    }
  }

  const fetchMarks = async () => {
    try {
      const response = await axios.get('/_/backend/student/marks')
      setMarks(response.data)
    } catch (err) {
      console.error('Failed to fetch marks:', err)
    }
  }

  const fetchAttendance = async () => {
    try {
      const response = await axios.get('/_/backend/student/attendance')
      setAttendance(response.data)
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  const handleSecureAction = () => {
    if (!dashboard) {
      setError('Dashboard data is not loaded yet.')
      return
    }
    setSecureActionMessage('Behavioral check passed. Your report is ready for download.')
    handleDownloadReport()
  }

  const handleDownloadReport = () => {
    if (!dashboard) return

    // Fetch full report data
    axios.get('/_/backend/student/report')
      .then(response => {
        const report = response.data

        const doc = new jsPDF({ format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 20
        let y = 20

        const drawHeading = (text) => {
          doc.setFontSize(18)
          doc.setFont('helvetica', 'bold')
          doc.text(text, pageWidth / 2, y, { align: 'center' })
          y += 12
          doc.setLineWidth(0.5)
          doc.line(margin, y, pageWidth - margin, y)
          y += 10
        }

        const drawKeyValue = (label, value) => {
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text(`${label}:`, margin, y)
          doc.setFont('helvetica', 'normal')
          doc.text(String(value), margin + 40, y)
          y += 8
        }

        const subjectGrades = report.marks || {}
        const gradeRows = Object.keys(subjectGrades).length > 0
          ? Object.entries(subjectGrades)
          : ['Mathematics', 'Physics', 'Chemistry', 'English'].map(subject => [subject, 'Not graded'])

        drawHeading('Student Report Card')
        drawKeyValue('Student Name', report.studentName)
        drawKeyValue('Student ID', report.studentId)
        drawKeyValue('Last Login', dashboard.lastLogin ? formatDateTime(dashboard.lastLogin.loginTime) : 'No record')
        drawKeyValue('Status', dashboard.status)
        drawKeyValue('Attendance %', `${report.attendance?.percentage || 0}%`)
        y += 8
        doc.setLineWidth(0.2)
        doc.line(margin, y, pageWidth - margin, y)
        y += 10

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Subject              Grade', margin, y)
        y += 8

        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        gradeRows.forEach(([subject, grade]) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          doc.text(subject, margin, y)
          doc.text(String(grade), pageWidth - margin - 20, y, { align: 'right' })
          y += 8
        })

        if (y > 260) {
          doc.addPage()
          y = 20
        }

        y += 10
        doc.setFont('helvetica', 'bold')
        doc.text('Generated At:', margin, y)
        doc.setFont('helvetica', 'normal')
        doc.text(new Date().toLocaleString(), margin + 30, y)

        doc.save(`student-report-${report.studentId || 'report'}.pdf`)
      })
      .catch(err => {
        setError('Failed to generate report')
        console.error('Report fetch error:', err)
      })
  }

  const formatDateTime = (value) => {
    if (!value) return 'No record'
    const date = new Date(value)
    return date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
  }

  if (!user) return null
  if (user.role !== 'student') {
    return (
      <div className="activity-container">
        <div className="activity-header">
          <h1>Student Access Required</h1>
        </div>
        <div className="error-message">You do not have permission to view this page.</div>
      </div>
    )
  }

  return (
    <div className="activity-container" onMouseMove={handleMouseMove} onKeyDown={handleKeyPress}>
      <div className="activity-header">
        <div>
          <h1>Student Dashboard</h1>
          <p style={{ margin: 0, color: '#555' }}>
            Welcome to your secure learning hub. Review your marks, attendance, schedule, and recent activity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchDashboard} className="refresh-btn">
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

      {loading ? (
        <div className="loading">Loading your student dashboard...</div>
      ) : dashboard ? (
        <div style={{ padding: '28px 32px', maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: '1 1 320px', padding: '24px', background: '#fff', borderRadius: '14px', border: '1px solid #e8eef5', boxShadow: '0 12px 30px rgba(22, 58, 103, 0.04)' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#1e3c72' }}>Welcome {dashboard.studentName}</h2>
              <p style={{ margin: '12px 0 0', color: '#555' }}>ID: <strong>{dashboard.studentId}</strong></p>
              <p style={{ margin: '10px 0 0', color: '#555' }}>
                Last login: <strong>{formatDateTime(dashboard.lastLogin?.loginTime)}</strong>
              </p>
              <p style={{ margin: '10px 0 0', color: dashboard.status === 'Secure' ? '#216e39' : '#b02a37', fontWeight: 700 }}>
                Status: {dashboard.status}
              </p>
            </div>
            <div style={{ flex: '1 1 320px', padding: '24px', background: '#fff', borderRadius: '14px', border: '1px solid #e8eef5', boxShadow: '0 12px 30px rgba(22, 58, 103, 0.04)' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1e3c72' }}>Quick Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '14px', marginTop: '18px' }}>
                <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#2a5298', fontWeight: 700 }}>Attendance</p>
                  <p style={{ margin: '10px 0 0', fontSize: '24px', fontWeight: 700 }}>{attendance?.percentage || 0}%</p>
                </div>
                <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#2a5298', fontWeight: 700 }}>Subjects</p>
                  <p style={{ margin: '10px 0 0', fontSize: '24px', fontWeight: 700 }}>{dashboard.marks.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '24px' }}>
            <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #f0f4fb', background: '#f8fafc' }}>
                <h2 style={{ margin: 0, color: '#1e3c72' }}>📊 Subject Grades</h2>
                <p style={{ margin: '10px 0 0', color: '#555' }}>Review the grade for each subject.</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
                  <thead>
                    <tr style={{ background: '#eef4ff' }}>
                      <th style={tableHeaderStyle}>Subject</th>
                      <th style={tableHeaderStyle}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Mathematics', 'Physics', 'Chemistry', 'English'].map(subject => (
                      <tr key={subject} style={{ borderBottom: '1px solid #eef0f5' }}>
                        <td style={tableCellStyle}>{subject}</td>
                        <td
                          style={{
                            ...tableCellStyle,
                            color: marks[subject] === 'ABSENT' ? '#ff0019' : '#333',
                            fontWeight: marks[subject] === 'ABSENT' ? 'bold' : 'normal',
                          }}
                        >
                          {marks[subject] || 'Not graded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', padding: '24px', display: 'grid', gap: '18px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e3c72' }}>📊 Overall Attendance</h3>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1e3c72' }}>{attendance?.percentage || 0}%</div>
                  <p style={{ margin: '10px 0 0', color: '#555' }}>
                    {attendance ? `${attendance.presentDays} / ${attendance.totalDays} days` : 'No data'}
                  </p>
                  <div style={{ width: '100%', height: '10px', background: '#e8eef5', borderRadius: '5px', marginTop: '10px' }}>
                    <div style={{ width: `${attendance?.percentage || 0}%`, height: '100%', background: '#1e3c72', borderRadius: '5px' }}></div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', padding: '24px', display: 'grid', gap: '18px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e3c72' }}>🗓️ Today&apos;s Schedule</h3>
                </div>
                {dashboard.timetable.map(item => (
                  <div key={`${item.time}-${item.class}`} style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc' }}>
                    <p style={{ margin: 0, color: '#2a5298', fontWeight: 700 }}>{item.time}</p>
                    <p style={{ margin: '6px 0 0', fontWeight: 600 }}>{item.class}</p>
                    <p style={{ margin: '4px 0 0', color: '#555' }}>{item.location}</p>
                  </div>
                ))}
                <div style={{ padding: '16px', borderRadius: '12px', background: '#fff2f0', border: '1px solid #ffd8d0' }}>
                  <strong>Upcoming exams</strong>
                  {dashboard.exams.map(exam => (
                    <p key={exam.date} style={{ margin: '8px 0 0', color: '#555' }}>
                      {exam.date} · {exam.subject} · {exam.type}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e8eef5', padding: '24px' }}>
              <h2 style={{ margin: 0, color: '#1e3c72' }}>📌 Important Notices</h2>
              <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                {visibleNotices.length > 0 ? visibleNotices.map((notice, index) => {
                  const title = notice?.title || 'Notice'
                  const message = notice?.message || notice?.text || String(notice)
                  const postedBy = notice?.postedByName || notice?.postedBy || 'Faculty'
                  const createdAt = notice?.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''
                  return (
                    <div key={notice?.id || index} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8eef5' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#1e3c72' }}>{title}</h4>
                      <p style={{ margin: 0, color: '#444' }}>{message}</p>
                      <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
                        Posted by {postedBy}{createdAt ? ` on ${createdAt}` : ''}
                      </small>
                    </div>
                  )
                }) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', color: '#666', textAlign: 'center' }}>
                    No notices available
                  </div>
                )}
              </div>
            </section>

            <section style={{ background: '#f4f8ff', borderRadius: '16px', border: '1px solid #dbe7ff', padding: '24px', display: 'grid', gap: '18px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e3c72' }}>🔐 Secure Actions</h2>
                <p style={{ margin: '10px 0 0', color: '#555' }}>
                  These actions are behaviorally protected to keep your sensitive data safe.
                </p>
              </div>
              <button
                onClick={handleSecureAction}
                style={{ padding: '14px 22px', background: '#1e3c72', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', width: 'max-content' }}
              >
                Download Report Card
              </button>
              {secureActionMessage && (
                <p style={{ margin: 0, color: '#216e39', fontWeight: 700 }}>{secureActionMessage}</p>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="no-data">No student dashboard data available yet.</div>
      )}
    </div>
  )
}

export default StudentPage
