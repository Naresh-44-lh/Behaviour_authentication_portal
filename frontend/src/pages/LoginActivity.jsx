import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import '../styles/Activity.css'

const LoginActivity = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Determine endpoint based on user role
      const endpoint = user?.role === 'admin' ? '/api/activity/all-activity' : '/api/activity/my-activity'
      const response = await axios.get(endpoint)
      
      setActivities(response.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch activities')
      console.error('Error details:', err)
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

  return (
    <div className="activity-container">
      <div className="activity-header">
        <div>
          <h1>{user?.role === 'admin' ? 'All Users Login Activity' : 'My Login Activity'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchActivities} className="refresh-btn">
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

      <div className="activity-table-wrapper">
        {loading ? (
          <div className="loading">Loading login activities...</div>
        ) : activities.length === 0 ? (
          <div className="no-data">No login activity found</div>
        ) : (
          <table className="activity-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Login Time</th>
                <th>IP Address</th>
                <th>Device Information</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td><strong>{activity.username}</strong></td>
                  <td>{new Date(activity.loginTime).toLocaleString()}</td>
                  <td>{activity.ipAddress}</td>
                  <td className="device">{activity.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default LoginActivity
