import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/Auth.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-brand-panel">
        <div className="auth-brand-grid" />
        <div className="auth-brand-shape s1" />
        <div className="auth-brand-shape s2" />
        <div className="auth-brand-shape s3" />

        <div className="auth-brand-top">
          <span className="auth-brand-logo" />
          Flowboard
        </div>

        <div className="auth-brand-mid">
          <h2>Plan work, track progress, ship together.</h2>
          <p>Boards, tasks, and comments that update live for your whole team — no refresh needed.</p>
        </div>

        <div className="auth-brand-features">
          <span><span className="dot" /> Drag-and-drop task boards</span>
          <span><span className="dot" /> Real-time sync across teammates</span>
          <span><span className="dot" /> Comments, assignees, and activity</span>
        </div>

        <div className="auth-brand-highlight">
          <div className="auth-brand-highlight-title">Built for busy teams</div>
          <ul>
            <li>Live updates the moment a teammate moves a card</li>
            <li>Clear ownership on every task</li>
            <li>One board, zero status-update meetings</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Welcome back</h1>
          <p className="sub">Sign in to open your projects.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-switch">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
