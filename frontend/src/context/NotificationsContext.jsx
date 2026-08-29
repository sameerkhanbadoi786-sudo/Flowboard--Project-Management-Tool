import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext.jsx'
import { api } from '../lib/api.js'
import { getSocket } from '../lib/socket.js'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState([])

  const refresh = useCallback(async () => {
    if (!token) return
    const data = await api.listNotifications(token)
    setNotifications(data)
  }, [token])

  // Connects the shared socket for the whole session (not just while a
  // board is open), so notifications keep arriving in real time no matter
  // which page the user is on.
  useEffect(() => {
    if (!token) {
      setNotifications([])
      return
    }
    refresh()

    const socket = getSocket(token)
    socket.connect()

    const handleNotification = (note) => {
      setNotifications((prev) => [note, ...prev].slice(0, 50))
    }
    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [token, refresh])

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    await api.markNotificationRead(token, id)
  }, [token])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await api.markAllNotificationsRead(token)
  }, [token])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, refresh, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider')
  return ctx
}
