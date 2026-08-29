import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { getSocket } from '../lib/socket.js'
import CardModal from '../components/CardModal.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ExportMenu from '../components/ExportMenu.jsx'
import { exportProjectPDF, exportProjectDocx } from '../lib/export.js'
import { FiArrowLeft, FiUserPlus, FiTrash2 } from 'react-icons/fi'
import '../styles/Board.css'

export default function Board() {
  const { projectId } = useParams()
  const { username, token } = useAuth()
  const navigate = useNavigate()

  const [board, setBoard] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeCard, setActiveCard] = useState(null)
  const [newListTitle, setNewListTitle] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [draggingCardId, setDraggingCardId] = useState(null)
  const [dragOverListId, setDragOverListId] = useState(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const draggedCard = useRef(null); // { cardId, fromListId }

  const refresh = useCallback(async () => {
    try {
      const data = await api.getBoard(token, projectId)
      setBoard(data)
      setTitleDraft(data.name)
    } catch {
      setNotFound(true)
    }
  }, [token, projectId])

  useEffect(() => {
    refresh()

    // The socket connection itself is owned by NotificationsProvider for
    // the lifetime of the session — here we just join/leave this project's
    // room and listen for board-specific events.
    const socket = getSocket(token)
    socket.emit('join-project', projectId)

    const handleBoardUpdated = (updated) => {
      if (updated.id === projectId) {
        setBoard(updated)
        setTitleDraft(updated.name)
      }
    }
    const handleProjectDeleted = (payload) => {
      if (payload.id === projectId) navigate('/projects')
    }

    socket.on('board-updated', handleBoardUpdated)
    socket.on('project-deleted', handleProjectDeleted)

    return () => {
      socket.emit('leave-project', projectId)
      socket.off('board-updated', handleBoardUpdated)
      socket.off('project-deleted', handleProjectDeleted)
    }
  }, [projectId, token, refresh, navigate])

  // Keep the open modal's card data fresh when real-time updates arrive.
  useEffect(() => {
    if (!activeCard || !board) return
    const fresh = board.lists.flatMap((l) => l.cards).find((c) => c.id === activeCard.id)
    if (fresh) setActiveCard(fresh)
  }, [board]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddList = async (e) => {
    e.preventDefault()
    if (!newListTitle.trim()) return
    await api.createList(token, projectId, newListTitle.trim())
    setNewListTitle('')
    setAddingList(false)
  }

  const handleAddCard = async (listId, title) => {
    if (!title.trim()) return
    await api.createCard(token, listId, { title: title.trim() })
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    try {
      await api.invite(token, projectId, inviteName.trim())
      setInviteName('')
      setInviteOpen(false)
    } catch (err) {
      setInviteError(err.message)
    }
  }

  const handleRenameBlur = async () => {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === board.name) {
      setTitleDraft(board.name)
      return
    }
    await api.renameProject(token, projectId, trimmed)
  }

  const handleDeleteProject = async () => {
    setDeleting(true)
    try {
      await api.deleteProject(token, projectId)
      navigate('/projects')
    } catch {
      setDeleting(false)
    }
  }

  // --- Drag and drop between lists ----------------------------------
  const handleDragStart = (cardId, fromListId) => {
    draggedCard.current = { cardId, fromListId }
    setDraggingCardId(cardId)
  }

  const handleDragEnd = () => {
    setDraggingCardId(null)
    setDragOverListId(null)
  }

  const handleDrop = async (toListId) => {
    const drag = draggedCard.current
    draggedCard.current = null
    setDraggingCardId(null)
    setDragOverListId(null)
    if (!drag || drag.fromListId === toListId) return
    const toList = board.lists.find((l) => l.id === toListId)
    await api.updateCard(token, drag.cardId, { listId: toListId, order: toList.cards.length })
  }

  if (notFound) {
    return (
      <div className="board-loading">
        This project doesn't exist anymore, or you're not a member of it.{' '}
        <Link to="/projects">Back to projects</Link>
      </div>
    )
  }

  if (!board) return <div className="board-loading">Loading board…</div>

  const isOwner = board.ownerUsername === username

  return (
    <div className="board-page">
      <div className="board-topbar">
        <Link to="/projects" className="board-back"><FiArrowLeft /> Projects</Link>
        <div className="board-title-block">
          <input
            className="board-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleRenameBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
          <div className="board-progress">
            <ProgressBar percent={board.progress?.percent ?? 0} size="sm" />
          </div>
        </div>
        <div className="board-members">
          {board.memberUsernames.map((m) => (
            <span key={m} className="member-chip" title={m}>{m[0].toUpperCase()}</span>
          ))}
          <button className="btn btn-secondary invite-btn" onClick={() => setInviteOpen((v) => !v)}>
            <FiUserPlus /> Invite
          </button>
        </div>
        <ExportMenu
          onExportPDF={() => exportProjectPDF(board)}
          onExportDocx={() => exportProjectDocx(board)}
        />
        {isOwner && (
          <button
            className="btn btn-danger board-delete-btn"
            title="Delete project"
            onClick={() => setDeleteOpen(true)}
          >
            <FiTrash2 />
          </button>
        )}
      </div>

      {inviteOpen && (
        <form className="invite-form" onSubmit={handleInvite}>
          <input
            placeholder="Username to invite"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Add to project</button>
          {inviteError && <span className="invite-error">{inviteError}</span>}
        </form>
      )}

      <div className="board-lists">
        {board.lists.map((list, i) => (
          <ListColumn
            key={list.id}
            list={list}
            delay={i * 60}
            onAddCard={handleAddCard}
            onOpenCard={setActiveCard}
            onDragStartCard={handleDragStart}
            onDragEndCard={handleDragEnd}
            onDropOnList={handleDrop}
            draggingCardId={draggingCardId}
            isDragOver={dragOverListId === list.id}
            onDragEnterList={() => setDragOverListId(list.id)}
          />
        ))}

        <div className="add-list-col">
          {addingList ? (
            <form onSubmit={handleAddList} className="add-list-form">
              <input
                autoFocus
                placeholder="List title"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onBlur={() => !newListTitle && setAddingList(false)}
              />
              <button type="submit">Add</button>
            </form>
          ) : (
            <button className="add-list-btn" onClick={() => setAddingList(true)}>+ Add list</button>
          )}
        </div>
      </div>

      {activeCard && (
        <CardModal
          card={activeCard}
          token={token}
          members={board.memberUsernames}
          onClose={() => setActiveCard(null)}
          onUpdated={refresh}
          onDeleted={() => { setActiveCard(null); refresh() }}
        />
      )}

      {deleteOpen && (
        <ConfirmDialog
          title={`Delete "${board.name}"?`}
          message="This permanently deletes the project along with every list, card, and comment inside it. This can't be undone."
          confirmLabel="Delete project"
          busy={deleting}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </div>
  )
}

function ListColumn({
  list, onAddCard, onOpenCard, onDragStartCard, onDragEndCard, onDropOnList,
  draggingCardId, isDragOver, onDragEnterList, delay = 0,
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    await onAddCard(list.id, title)
    setTitle('')
    setAdding(false)
  }

  return (
    <div
      className={`list-column ${isDragOver ? 'drag-over' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnterList}
      onDrop={() => onDropOnList(list.id)}
    >
      <div className="list-header">
        <span>{list.title}</span>
        <span className="list-count">{list.cards.length}</span>
      </div>

      <div className="list-cards">
        {list.cards.map((card, i) => (
          <div
            key={card.id}
            className={`board-card ${draggingCardId === card.id ? 'dragging' : ''}`}
            style={{ animationDelay: `${i * 30}ms` }}
            draggable
            onDragStart={() => onDragStartCard(card.id, list.id)}
            onDragEnd={onDragEndCard}
            onClick={() => onOpenCard(card)}
          >
            <div className="board-card-title">{card.title}</div>
            <div className="board-card-meta">
              {card.assignee && <span className="board-card-assignee">{card.assignee}</span>}
              {card.comments.length > 0 && (
                <span className="board-card-comments">💬 {card.comments.length}</span>
              )}
            </div>
          </div>
        ))}
        {isDragOver && <div className="drop-indicator" />}
      </div>

      {adding ? (
        <form onSubmit={submit} className="add-card-form">
          <input
            autoFocus
            placeholder="Card title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => !title && setAdding(false)}
          />
          <button type="submit">Add</button>
        </form>
      ) : (
        <button className="add-card-btn" onClick={() => setAdding(true)}>+ Add card</button>
      )}
    </div>
  )
}
