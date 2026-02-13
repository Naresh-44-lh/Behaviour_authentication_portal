import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-brand">
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
            </div>
          </div>

          <div className="dashboard-card">
            <h2>🔍 Activity & Security</h2>
            <div className="link-list">
              <button onClick={handleViewActivity} className="nav-link">
                📋 View Login Activity
              </button>
              {user?.role === 'admin' && (
                <div className="admin-note">
                  👨‍💼 <strong>Admin Privileges:</strong> You can view all users' login activity
                </div>
              )}
              {user?.role === 'user' && (
                <div className="user-note">
                  👤 <strong>User Access:</strong> You can only view your own login activity
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
