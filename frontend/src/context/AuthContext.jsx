import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
    }
    
    setLoading(false)
  }, [])

  const login = async (username, password, captchaToken, location) => {
    try {
      const payload = { username, password, captchaToken, location }
      const response = await axios.post('/_/backend/auth/login', payload)
      const { token, user } = response.data
      
      setToken(token)
      setUser(user)
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      return { success: true, token }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' }
    }
  }

  const register = async (username, email, password) => {
    try {
      const response = await axios.post('/_/backend/auth/register', { username, email, password })
      return { success: true, message: response.data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Registration failed' }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
