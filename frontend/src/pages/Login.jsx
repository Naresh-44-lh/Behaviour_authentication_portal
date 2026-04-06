import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMetricsTracking } from '../hooks/useMetricsTracking'
import ReCAPTCHA from 'react-google-recaptcha'
import '../styles/Auth.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [location, setLocation] = useState('')
  const [locationError, setLocationError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const { startTracking, handleKeyPress, handleMouseMove, submitMetrics } = useMetricsTracking()
  const navigate = useNavigate()

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Start tracking on mount
  React.useEffect(() => {
    startTracking()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocation(`${latitude.toFixed(6)},${longitude.toFixed(6)}`)
        },
        (error) => {
          setLocationError('Unable to detect location')
          console.warn('Geolocation error:', error)
        },
        { timeout: 8000 }
      )
    } else {
      setLocationError('Geolocation not supported')
    }
  }, [startTracking])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      setLoading(false)
      return
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification')
      setLoading(false)
      return
    }

    let resolvedLocation = location
    if (!resolvedLocation && navigator.geolocation) {
      resolvedLocation = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            resolve(`${latitude.toFixed(6)},${longitude.toFixed(6)}`)
          },
          () => resolve(''),
          { timeout: 8000 }
        )
      })
      if (resolvedLocation) {
        setLocation(resolvedLocation)
      }
    }

    const result = await login(username, password, captchaToken, resolvedLocation)
    setLoading(false)

    if (!result.success) {
      setError('Invalid username or password')
      setPassword('')
      setCaptchaToken('') // Reset CAPTCHA on failure
    } else {
      // Submit metrics after successful login (token available)
      await submitMetrics(result.token)
      navigate('/dashboard')
    }
  }

  return (
    <div className="auth-container" onMouseMove={handleMouseMove}>
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
                onKeyPress={handleKeyPress}
                onMouseMove={handleMouseMove}
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
                onKeyPress={handleKeyPress}
                onMouseMove={handleMouseMove}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group captcha-group">
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test key for development
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken('')}
                theme="light"
                size="normal"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {location && <div className="success-message">Location captured: {location}</div>}
            {locationError && <div className="error-message">{locationError}</div>}

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-links">
            Don't have an account? <Link to="/register">Sign up here</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
