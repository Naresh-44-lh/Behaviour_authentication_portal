import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import '../styles/Activity.css'

const AdminUsers = () => {
  const { user, token } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'student', expiresAt: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get('/api/admin/users')
      setUsers(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users')
    } finally { setLoading(false) }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const createUser = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await axios.post('/api/admin/users/create', {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        expiresAt: form.expiresAt || null
      })
      setForm({ username: '', email: '', password: '', role: 'student', expiresAt: '' })
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user')
    } finally { setLoading(false) }
  }

  const toggleBlock = async (id, current) => {
    try {
      await axios.post(`/api/admin/users/${id}/block`, { block: !current })
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user')
    }
  }

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await axios.post(`/api/admin/users/${id}/delete`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user')
    }
  }

  const changeRole = async (id, newRole) => {
    try {
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      await axios.post(`/api/admin/users/${id}/role`, { role: newRole }, { headers })
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change role')
    }
  }

  if (!user) return null
  if (user.role !== 'admin') return <div className="activity-container"><div className="error-message">Admin access required</div></div>

  return (
    <div className="activity-container">
      <div className="activity-header">
        <h1>Users Management</h1>
        <div />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="activity-create">
        <h3>Create User / Temporary Access</h3>
        <form onSubmit={createUser} className="create-form">
          <input name="username" value={form.username} onChange={handleFormChange} placeholder="username" required />
          <input name="email" value={form.email} onChange={handleFormChange} placeholder="email" required />
          <input name="password" value={form.password} onChange={handleFormChange} placeholder="password" required />
          <select name="role" value={form.role} onChange={handleFormChange}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
          <input name="expiresAt" value={form.expiresAt} onChange={handleFormChange} type="datetime-local" placeholder="Temporary until (optional)" />
          <button type="submit" className="create-btn">Create</button>
        </form>
      </div>

      <div className="activity-table-wrapper">
        {loading ? (
          <div className="loading">Loading users...</div>
        ) : (
          <div className="activity-scroll-container">
            <table className="activity-table">
              <thead>
                <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Registered</th>
                <th>Temporary</th>
                <th>Expires At</th>
                <th>Login Attempts</th>
                <th>Failed Attempts</th>
                <th>Blocked</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                  <td>{u.isTemporary ? 'Yes' : 'No'}</td>
                  <td>{u.expiresAt ? new Date(u.expiresAt).toLocaleString() : '-'}</td>
                  <td>{u.loginAttempts ?? 0}</td>
                  <td>{u.failedAttempts ?? 0}</td>
                  <td>{u.isBlocked ? 'Yes' : 'No'}</td>
                  <td>
                    <button onClick={() => toggleBlock(u.id, u.isBlocked)} className="refresh-btn" style={{ background: u.isBlocked ? 'linear-gradient(135deg,#28a745,#218838)' : undefined, marginRight: '4px' }}>
                      {u.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="refresh-btn" style={{ background: 'linear-gradient(135deg,#dc3545,#c82333)' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
