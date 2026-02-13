import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Auth.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      setLoading(false)
      return
    }

    const result = await login(username, password)
    setLoading(false)

    if (!result.success) {
      setError('Invalid username or password')
      setPassword('')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <h1>Welcome</h1>
        <p>
          Access your account to view your login activity and manage your security settings. Admins have access to view all user activities.
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h1>Sign In</h1>
          <p className="subtitle">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider">
            <span>Demo Accounts</span>
          </div>

          <div className="auth-hint">
            <strong>Admin Account:</strong><br/>
            Username: <code>admin</code><br/>
            Password: <code>admin123</code><br/>
            <br/>
            <strong>User Account:</strong><br/>
            Username: <code>user1</code><br/>
            Password: <code>user123</code>
          </div>

          <div className="auth-links">
            Don't have an account? <Link to="/register">Sign up here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
