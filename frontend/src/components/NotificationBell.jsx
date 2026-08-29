import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import { useNotifications } from '../context/NotificationsContext.jsx'
import '../styles/NotificationBell.css'

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleItemClick = (note) => {
    if (!note.isRead) markRead(note.id)
    setOpen(false)
    // The project may since have been deleted — the board route will 404
    // gracefully via the same "not found" state as any stale link.
    if (note.projectId) navigate(`/project/${note.projectId}`)
  }

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-ghost notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <FiBell size={17} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">You're all caught up.</div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notif-item ${n.isRead ? '' : 'unread'}`}
                onClick={() => handleItemClick(n)}
              >
                <div className="notif-item-top">
                  <span className="notif-item-project">{n.projectName}</span>
                  <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                </div>
                <span className="notif-item-message">{n.message}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
