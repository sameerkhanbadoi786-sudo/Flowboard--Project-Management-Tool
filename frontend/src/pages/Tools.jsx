import { useAuth } from '../context/AuthContext.jsx'
import { useNotifications } from '../context/NotificationsContext.jsx'
import Navbar from '../components/Navbar.jsx'
import { FiBell, FiDownload, FiZap, FiCheck } from 'react-icons/fi'
import '../styles/Tools.css'

const shipped = [
  { icon: FiBell, title: 'Notifications', desc: 'Live-pushed whenever a project you\'re on changes — new cards, moves, comments, invites, and completions. Click the bell in the navbar.' },
  { icon: FiDownload, title: 'Board export', desc: 'Export any single board, or a summary of every project you\'re on, to PDF or Word — from the board page or the Projects page.' },
]

const upcoming = [
  { icon: FiZap, title: 'Automations', desc: 'Auto-move cards between lists based on rules you set.' },
]

export default function Tools() {
  const { username, fullName, email } = useAuth()
  const { unreadCount } = useNotifications()

  return (
    <div className="tools-page">
      <Navbar />

      <div className="tools-body">
        <div className="home-header">
          <h1>Tools & settings</h1>
          <p>Your account, and what's available.</p>
        </div>

        <div className="tools-section">
          <h2>Account</h2>
          <div className="account-card">
            <span className="account-avatar">{(fullName || username)?.[0]?.toUpperCase()}</span>
            <div>
              <div className="account-name">{fullName || username}</div>
              <div className="account-meta">
                @{username}{email && ` · ${email}`}
                {unreadCount > 0 && ` · ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </div>

        <div className="tools-section">
          <h2>Available now</h2>
          <div className="tools-grid">
            {shipped.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="tool-card">
                <div className="tool-card-icon"><Icon size={16} /></div>
                <div className="tool-card-title">{title}</div>
                <div className="tool-card-desc">{desc}</div>
                <span className="tool-card-badge tool-card-badge-live"><FiCheck size={11} /> Live</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tools-section">
          <h2>Coming soon</h2>
          <div className="tools-grid">
            {upcoming.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="tool-card">
                <div className="tool-card-icon"><Icon size={16} /></div>
                <div className="tool-card-title">{title}</div>
                <div className="tool-card-desc">{desc}</div>
                <span className="tool-card-badge">Planned</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
