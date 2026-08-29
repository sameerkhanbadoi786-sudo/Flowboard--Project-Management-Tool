import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { FiHome, FiGrid, FiTool, FiSun, FiMoon } from 'react-icons/fi'
import NotificationBell from './NotificationBell.jsx'
import '../styles/Navbar.css'

const links = [
  { to: '/', label: 'Home', icon: FiHome, end: true },
  { to: '/projects', label: 'Projects', icon: FiGrid },
  { to: '/tools', label: 'Tools', icon: FiTool },
]

export default function Navbar() {
  const { username, fullName, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const displayName = fullName || username
  const location = useLocation()
  const containerRef = useRef(null)
  const linkRefs = useRef({})
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 })

  useEffect(() => {
    const active = links.find((l) =>
      l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
    )
    const el = active && linkRefs.current[active.to]
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      setIndicator({ left: rect.left - containerRect.left, width: rect.width, opacity: 1 })
    } else {
      setIndicator((prev) => ({ ...prev, opacity: 0 }))
    }
  }, [location.pathname])

  return (
    <div className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo" />
        Flowboard
      </div>

      <div className="navbar-links" ref={containerRef}>
        <span
          className="navbar-indicator"
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
            opacity: indicator.opacity,
          }}
        />
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            ref={(el) => { linkRefs.current[to] = el }}
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-user">
        <button
          className="navbar-theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
        </button>
        <NotificationBell />
        <span className="navbar-avatar">{displayName?.[0]?.toUpperCase()}</span>
        <span className="navbar-username">{displayName}</span>
        <button className="btn btn-ghost navbar-logout" onClick={logout}>Sign out</button>
      </div>
    </div>
  )
}
