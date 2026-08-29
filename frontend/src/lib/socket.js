import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

let socket = null

export function getSocket(token) {
  if (socket) return socket
  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
  })
  return socket
}

// Called on logout so the connection (and its personal `user:<name>` room,
// used for notifications) doesn't linger after the session ends. A fresh
// login creates a new socket via getSocket, since `auth.token` needs to
// change with the new session's token.
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
