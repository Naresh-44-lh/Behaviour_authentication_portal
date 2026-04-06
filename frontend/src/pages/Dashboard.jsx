import React, { useEffect, useState } from 'react'
import logo from '../assets/logo.svg'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMetricsTracking } from '../hooks/useMetricsTracking'
import '../styles/Dashboard.css'

const Dashboard = () => {
  const { user, logout, token } = useAuth()
  const navigate = useNavigate()
  const { startTracking, handleKeyPress, handleMouseMove, submitMetrics } = useMetricsTracking()

  // Start tracking metrics on dashboard mount
  useEffect(() => {
    startTracking()

    // Submit metrics when user leaves or logs out (cleanup)
    return async () => {
      if (token) {
        await submitMetrics(token)
      }
    }
  }, [token, startTracking, submitMetrics])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleViewActivity = () => {
    navigate('/activity')
  }

  const getRoleColor = (role) => {
    return role === 'admin' ? '#dc3545' : '#007bff'
  }

  const [lastLogin, setLastLogin] = useState(null)
  const [securityStatus, setSecurityStatus] = useState('Secure')

  useEffect(() => {
    if (user?.role === 'student') {
      const fetchActivity = async () => {
        try {
          const response = await axios.get('/api/activity/my-activity')
          const latest = response.data?.[0]
          if (latest) {
            setLastLogin(latest.login_time || latest.loginTime)
            setSecurityStatus((latest.location && latest.location !== 'Unknown') ? 'Secure' : 'Suspicious')
          }
        } catch (err) {
          setLastLogin(null)
        }
      }
      fetchActivity()
    }
  }, [user])

  return (
    <div className="dashboard-container" onMouseMove={handleMouseMove} onKeyDown={handleKeyPress}>
      <nav className="navbar">
        <div className="nav-brand">
          <img src={logo} alt="Simply Safe" className="app-logo"/>
          <h1>🔐 Authentication Portal</h1>
        </div>
        <div className="nav-content">
          <div className="user-info">
            <span>Welcome, <strong>{user?.username}</strong></span>
            <span 
              className="role-badge" 
              style={{ backgroundColor: getRoleColor(user?.role) }}
            >
              {user?.role?.toUpperCase()}
            </span>
          </div>
          {user?.messages && user.messages.length > 0 && (
            <div className="user-messages">
              {user.messages.map((m, i) => (
                <div key={i} className="message-item">{m}</div>
              ))}
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>👤 Account Information</h2>
            <div className="user-details">
              <p>
                <strong>Username:</strong><br/>
                {user?.username}
              </p>
              <p>
                <strong>Email:</strong><br/>
                {user?.email}
              </p>
              <p>
                <strong>Account Role:</strong><br/>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </p>
              {user?.isTemporary && (
                <p>
                  <strong>Temporary Until:</strong><br/>
                  {new Date(user.expiresAt).toLocaleString()}
                </p>
              )}
              {user?.loginAttempts !== undefined && (
                <p>
                  <strong>Login Attempts:</strong> {user.loginAttempts}
                </p>
              )}
              {user?.avgMouseMovements !== undefined && (
                <p>
                  <strong>Average Mouse Movements:</strong> {Math.round(user.avgMouseMovements)}
                </p>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <h2>🔍 Activity & Security</h2>
            <div className="link-list">
              <button onClick={handleViewActivity} className="nav-link">
                📋 View Login Activity
              </button>
              {user?.role === 'faculty' && (
                <button onClick={() => navigate('/faculty')} className="nav-link">
                  🎓 Faculty Dashboard
                </button>
              )}
              {user?.role === 'student' && (
                <button onClick={() => navigate('/student')} className="nav-link">
                  📚 My Student Record
                </button>
              )}
              {user?.role === 'admin' && (
                <button onClick={() => navigate('/admin/users')} className="nav-link">
                  👥 Manage Users
                </button>
              )}
              {user?.role === 'admin' && (
                <button onClick={() => navigate('/admin/analytics')} className="nav-link">
                  📊 View Analytics
                </button>
              )}
              {user?.role === 'admin' && (
                <div className="admin-note">
                  👨‍💼 <strong>Admin Privileges:</strong> You can view all users' login activity and analytics
                </div>
              )}
              {user?.role === 'student' && (
                <div className="user-note">
                  👤 <strong>Student Access:</strong> You can view your own marks and attendance
                </div>
              )}
              {user?.role === 'faculty' && (
                <div className="user-note">
                  👩‍🏫 <strong>Faculty Access:</strong> You can manage student marks and attendance
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
