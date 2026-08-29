import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Home from './pages/Home.jsx'
import Projects from './pages/Projects.jsx'
import Tools from './pages/Tools.jsx'
import Board from './pages/Board.jsx'

function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

// Re-mounting the route's container on every path change lets a plain CSS
// keyframe animation replay each time — a lightweight page transition
// without pulling in an animation library.
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Routes location={location}>
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/projects" element={<RequireAuth><Projects /></RequireAuth>} />
        <Route path="/tools" element={<RequireAuth><Tools /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/project/:projectId" element={<RequireAuth><Board /></RequireAuth>} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <AnimatedRoutes />
      </NotificationsProvider>
    </AuthProvider>
  )
}
