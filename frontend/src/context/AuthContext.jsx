import { createContext, useContext, useState, useCallback } from 'react'
import { disconnectSocket } from '../lib/socket.js'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(() => localStorage.getItem('ledger_username'))
  const [fullName, setFullName] = useState(() => localStorage.getItem('ledger_fullname'))
  const [email, setEmail] = useState(() => localStorage.getItem('ledger_email'))
  const [token, setToken] = useState(() => localStorage.getItem('ledger_token'))

  const persist = (data) => {
    localStorage.setItem('ledger_token', data.token)
    localStorage.setItem('ledger_username', data.username)
    localStorage.setItem('ledger_fullname', data.fullName || '')
    localStorage.setItem('ledger_email', data.email || '')
    setToken(data.token)
    setUsername(data.username)
    setFullName(data.fullName || '')
    setEmail(data.email || '')
  }

  // Login is by email now (not username) — the backend still issues the
  // same { id, username } token, so nothing else in the app needs to
  // change: usernames stay the identity used for assignees, ownership,
  // and membership everywhere else.
  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    persist(data)
    return data
  }, [])

  const register = useCallback(async ({ fullName, username, email, password, agreePrivacy }) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, email, password, agreePrivacy }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    persist(data)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ledger_token')
    localStorage.removeItem('ledger_username')
    localStorage.removeItem('ledger_fullname')
    localStorage.removeItem('ledger_email')
    setToken(null)
    setUsername(null)
    setFullName(null)
    setEmail(null)
    disconnectSocket()
  }, [])

  return (
    <AuthContext.Provider value={{ username, fullName, email, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
