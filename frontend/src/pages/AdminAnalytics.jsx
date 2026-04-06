import React, { useEffect, useState } from 'react'
import logo from '../assets/logo.svg'
import { useNavigate } from 'react-router-dom'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import '../styles/AdminAnalytics.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const AdminAnalytics = () => {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [todayLogins, setTodayLogins] = useState([])
  const [accountCreation, setAccountCreation] = useState([])
  const [userMetrics, setUserMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Verify admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const headers = { Authorization: `Bearer ${token}` }

        // Fetch today's login stats
        const todayRes = await axios.get('/api/admin/stats/today-logins', { headers })
        setTodayLogins(todayRes.data || [])

        // Fetch account creation stats
        const creationRes = await axios.get('/api/admin/stats/account-creation', { headers })
        setAccountCreation(creationRes.data || [])

        // Fetch user metrics
        const metricsRes = await axios.get('/api/admin/users', { headers })
        setUserMetrics(metricsRes.data || [])
      } catch (err) {
        setError('Failed to load analytics data: ' + (err.response?.data?.error || err.message))
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchAnalytics()
    }
  }, [token])

  // Chart data for today's logins (bar chart)
  const todayLoginsChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: "Login Count",
        data: todayLogins.map(item => item.count || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  }

  // Chart data for account creation (line chart)
  const accountCreationChartData = {
    labels: accountCreation.map(item => item.date),
    datasets: [
      {
        label: "New Accounts",
        data: accountCreation.map(item => item.count || 0),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  }

  // Calculate average metrics
  const avgTypingSpeed = userMetrics.length > 0 
    ? (userMetrics.reduce((sum, u) => sum + (parseFloat(u.avgTypingSpeed) || 0), 0) / userMetrics.length).toFixed(2)
    : 0

  const avgMouseMovements = userMetrics.length > 0
    ? (userMetrics.reduce((sum, u) => sum + (u.avgMouseMovements || 0), 0) / userMetrics.length).toFixed(2)
    : 0

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-navbar">
          <div className="nav-brand">
            <h1>📊 Admin Analytics Dashboard</h1>
          </div>
          <button onClick={() => navigate('/dashboard')} className="back-btn">← Back to Dashboard</button>
        </div>
        <div className="analytics-content">
          <div className="loading">Loading analytics...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      <div className="analytics-navbar">
        <div className="nav-brand">
          <img src={logo} alt="Simply Safe" className="app-logo"/>
          <h1>📊 Admin Analytics Dashboard</h1>
        </div>
        <button onClick={() => navigate('/dashboard')} className="back-btn">← Back to Dashboard</button>
      </div>

      <div className="analytics-content">
        {error && <div className="error-message">{error}</div>}

        {/* Metrics Summary Cards */}
        <div className="metrics-summary">
          <div className="metric-card">
            <h3>📈 Avg Typing Speed</h3>
            <p className="metric-value">{avgTypingSpeed} <span className="metric-unit">keystrokes/sec</span></p>
          </div>
          <div className="metric-card">
            <h3>🖱️ Avg Mouse Movements</h3>
            <p className="metric-value">{avgMouseMovements} <span className="metric-unit">movements</span></p>
          </div>
          <div className="metric-card">
            <h3>👥 Total Users</h3>
            <p className="metric-value">{userMetrics.length}</p>
          </div>
          <div className="metric-card">
            <h3>🔐 Active Sessions</h3>
            <p className="metric-value">{todayLogins.reduce((sum, item) => sum + (item.count || 0), 0)}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Today's Logins Chart */}
          <div className="chart-container">
            <h2>📅 Today's Logins by Hour</h2>
            <div className="chart-wrapper">
              {todayLogins.length > 0 ? (
                <Bar
                  data={todayLoginsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { display: true, position: 'top' },
                      title: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                      },
                    },
                  }}
                />
              ) : (
                <div className="no-data">No login data available for today</div>
              )}
            </div>
          </div>

          {/* Account Creation Chart */}
          <div className="chart-container">
            <h2>📊 Account Creation Trend (Last 30 Days)</h2>
            <div className="chart-wrapper">
              {accountCreation.length > 0 ? (
                <Line
                  data={accountCreationChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { display: true, position: 'top' },
                      title: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                      },
                    },
                  }}
                />
              ) : (
                <div className="no-data">No account creation data available</div>
              )}
            </div>
          </div>
        </div>

        {/* User Metrics Table */}
        <div className="metrics-table-container">
          <h2>👥 User Metrics Details</h2>
          <div className="table-wrapper">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Avg Typing Speed (keystrokes/sec)</th>
                  <th>Avg Mouse Movements</th>
                  <th>Total Logins</th>
                </tr>
              </thead>
              <tbody>
                {userMetrics.length > 0 ? (
                  userMetrics.map(user => (
                    <tr key={user.id}>
                      <td><strong>{user.username}</strong></td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td>{parseFloat(user.avgTypingSpeed || 0).toFixed(2)}</td>
                      <td>{user.avgMouseMovements || 0}</td>
                      <td>{user.totalLogins || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data-message">No user metrics available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics
