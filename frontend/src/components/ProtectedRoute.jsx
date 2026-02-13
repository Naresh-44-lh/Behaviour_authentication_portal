import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f5f7fa',
        fontSize: '18px',
        color: '#666',
        fontWeight: '500'
      }}>
        Loading your account...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return children
}

export default ProtectedRoute
