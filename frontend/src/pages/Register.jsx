import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import '../styles/Auth.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (!agreePrivacy) {
      setError('You need to agree to the Privacy Policy to create an account.')
      return
    }

    setLoading(true)
    try {
      await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        agreePrivacy,
      })
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
          <h2>Bring your team's work into one clear view.</h2>
          <p>Create a project, invite your team, and watch tasks move in real time as everyone works.</p>
        </div>

        <div className="auth-brand-features">
          <span><span className="dot" /> Unlimited projects and boards</span>
          <span><span className="dot" /> Invite teammates instantly</span>
          <span><span className="dot" /> Free while you're building</span>
        </div>

        <div className="auth-brand-highlight">
          <div className="auth-brand-highlight-title">Get moving in minutes</div>
          <ul>
            <li>No setup calls or onboarding docs</li>
            <li>Invite your team with one link</li>
            <li>Your first board is ready instantly</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="sub">You'll need this to create or join projects.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
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
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <label className="auth-checkbox-field">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
              />
              <span>
                I agree to the{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
              </span>
            </label>

            <button className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
