import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import Navbar from '../components/Navbar.jsx'
import TiltCard from '../components/TiltCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ExportMenu from '../components/ExportMenu.jsx'
import { exportProjectsSummaryPDF, exportProjectsSummaryDocx } from '../lib/export.js'
import { FiTrash2 } from 'react-icons/fi'
import '../styles/Projects.css'

export default function Projects() {
  const { username, token } = useAuth()
  const [projects, setProjects] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null) // project pending delete confirmation
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await api.listProjects(token)
    setProjects(data)
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.createProject(token, name.trim())
    setName('')
    setShowForm(false)
    load()
  }

  const handleDeleteClick = (e, project) => {
    e.preventDefault() // don't navigate — the card is a Link
    e.stopPropagation()
    setDeleteError('')
    setDeleteTarget(project)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await api.deleteProject(token, deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="projects-page">
      <Navbar />

      <div className="projects-body">
        <div className="projects-header">
          <div>
            <h1>Your projects</h1>
            <p>Boards, tasks, and teammates in one place.</p>
          </div>
          <div className="projects-header-actions">
            {projects.length > 0 && (
              <ExportMenu
                label="Export all"
                onExportPDF={() => exportProjectsSummaryPDF(projects)}
                onExportDocx={() => exportProjectsSummaryDocx(projects)}
              />
            )}
            <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : '+ New project'}
            </button>
          </div>
        </div>

        {showForm && (
          <form className="new-project-form" onSubmit={handleCreate}>
            <input
              autoFocus
              placeholder="Project name, e.g. Website Revamp"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Create</button>
          </form>
        )}

        {!loading && projects.length === 0 && (
          <div className="empty-state">No projects yet — start one to get a board with To Do, In Progress, and Done.</div>
        )}

        <div className="project-grid">
          {projects.map((p, i) => (
            <TiltCard
              as={Link}
              key={p.id}
              to={`/project/${p.id}`}
              className="project-card"
              style={{ animationDelay: `${i * 40}ms` }}
              tilt={{ max: 8, lift: 8 }}
            >
              {p.ownerUsername === username && (
                <button
                  type="button"
                  className="project-card-delete"
                  title="Delete project"
                  onClick={(e) => handleDeleteClick(e, p)}
                >
                  <FiTrash2 size={14} />
                </button>
              )}
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

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.name}"?`}
          message={
            deleteError ||
            'This permanently deletes the project along with every list, card, and comment inside it. This can\'t be undone.'
          }
          confirmLabel="Delete project"
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
