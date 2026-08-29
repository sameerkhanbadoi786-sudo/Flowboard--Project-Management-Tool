import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import Navbar from '../components/Navbar.jsx'
import TiltCard from '../components/TiltCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { FiGrid, FiUsers, FiClock, FiArrowRight, FiTrendingUp } from 'react-icons/fi'
import '../styles/Home.css'

export default function Home() {
  const { username, fullName, token } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listProjects(token).then((data) => {
      setProjects(data)
      setLoading(false)
    })
  }, [token])

  const memberSet = new Set(projects.flatMap((p) => p.memberUsernames))
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = fullName ? fullName.trim().split(/\s+/)[0] : username

  const totalCards = projects.reduce((sum, p) => sum + (p.progress?.total || 0), 0)
  const doneCards = projects.reduce((sum, p) => sum + (p.progress?.done || 0), 0)
  const overallPercent = totalCards === 0 ? 0 : Math.round((doneCards / totalCards) * 100)
  const ownedCount = projects.filter((p) => p.ownerUsername === username).length

  return (
    <div className="home-page">
      <Navbar />

      <div className="home-body">
        <div className="home-hero">
          <div className="home-hero-grid" />
          <div className="home-hero-shape s1" />
          <div className="home-hero-shape s2" />

          <div className="home-hero-content">
            <span className="home-hero-eyebrow">Workspace overview</span>
            <h1>{greeting}, {firstName}.</h1>
            <p>Here's what's happening across your projects today.</p>
            <div className="home-hero-actions">
              <Link to="/projects" className="btn btn-primary">View all projects</Link>
              <Link to="/projects" className="btn home-hero-btn-ghost">Create new project</Link>
            </div>
          </div>

          <div className="home-hero-card">
            <div className="home-hero-card-title">Overall progress</div>
            <ProgressBar percent={overallPercent} size="lg" showLabel />
            <ul className="home-hero-card-list">
              <li><FiGrid /> {loading ? '—' : projects.length} active project{projects.length !== 1 ? 's' : ''}</li>
              <li><FiUsers /> {loading ? '—' : memberSet.size} collaborator{memberSet.size !== 1 ? 's' : ''}</li>
              <li><FiClock /> {loading ? '—' : ownedCount} owned by you</li>
            </ul>
          </div>
        </div>

        <div className="stat-grid">
          <TiltCard className="stat-card" style={{ animationDelay: '0ms' }} tilt={{ max: 6, lift: 6 }}>
            <div className="stat-icon stat-icon-primary"><FiGrid /></div>
            <div className="stat-value">{loading ? '—' : projects.length}</div>
            <div className="stat-label">Active projects</div>
          </TiltCard>
          <TiltCard className="stat-card" style={{ animationDelay: '60ms' }} tilt={{ max: 6, lift: 6 }}>
            <div className="stat-icon stat-icon-success"><FiUsers /></div>
            <div className="stat-value">{loading ? '—' : memberSet.size}</div>
            <div className="stat-label">Collaborators</div>
          </TiltCard>
          <TiltCard className="stat-card" style={{ animationDelay: '120ms' }} tilt={{ max: 6, lift: 6 }}>
            <div className="stat-icon stat-icon-warning"><FiClock /></div>
            <div className="stat-value">{loading ? '—' : projects.filter((p) => p.ownerUsername === username).length}</div>
            <div className="stat-label">Owned by you</div>
          </TiltCard>
          <TiltCard className="stat-card" style={{ animationDelay: '180ms' }} tilt={{ max: 6, lift: 6 }}>
            <div className="stat-icon stat-icon-primary"><FiTrendingUp /></div>
            <div className="stat-value">{loading ? '—' : `${overallPercent}%`}</div>
            <div className="stat-label">Overall completion</div>
          </TiltCard>
        </div>

        <div className="home-section-header">
          <h2>Recent projects</h2>
          <Link to="/projects" className="home-view-all">View all <FiArrowRight size={13} /></Link>
        </div>

        {!loading && projects.length === 0 && (
          <div className="empty-state">
            No projects yet.
            <Link to="/projects" className="btn btn-primary" style={{ marginTop: 14, display: 'inline-flex' }}>
              Create your first project
            </Link>
          </div>
        )}

        <div className="project-grid">
          {projects.slice(0, 3).map((p, i) => (
            <TiltCard
              as={Link}
              key={p.id}
              to={`/project/${p.id}`}
              className="project-card"
              style={{ animationDelay: `${i * 40}ms` }}
              tilt={{ max: 8, lift: 8 }}
            >
              <div className="project-card-icon">{p.name[0].toUpperCase()}</div>
              <div className="project-card-name">{p.name}</div>
              <div className="project-card-meta">
                {p.memberUsernames.length} member{p.memberUsernames.length !== 1 ? 's' : ''} · owner {p.ownerUsername}
              </div>
              <ProgressBar percent={p.progress?.percent ?? 0} size="sm" />
            </TiltCard>
          ))}
        </div>
      </div>
    </div>
  )
}

