import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/Auth.css'

const Register = () => {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const validateInputs = () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      return 'All fields are required'
    }
    if (username.length < 3) {
      return 'Username must be at least 3 characters long'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match'
    }
    if (!email.includes('@')) {
      return 'Please enter a valid email address'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const result = await register(username, email, password)
    setLoading(false)

    if (result.success) {
      setSuccess('Registration successful! Redirecting to login...')
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate('/login'), 2000)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-left">
        <h1>Create Account</h1>
        <p>
          Join our authentication portal to track your login activity and manage your security. Regular users can view their own activity, while admins have full visibility.
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h1>Sign Up</h1>
          <p className="subtitle">Create a new account</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
                placeholder="Create a password"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-links">
            Already have an account? <Link to="/login">Sign in here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
