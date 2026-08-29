import { useState } from 'react'
import { FiX, FiChevronDown, FiMessageSquare } from 'react-icons/fi'
import { api } from '../lib/api.js'
import ConfirmDialog from './ConfirmDialog.jsx'

export default function CardModal({ card, token, members, onClose, onUpdated, onDeleted }) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [assignee, setAssignee] = useState(card.assignee || '')
  const [commentText, setCommentText] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const saveField = async (patch) => {
    await api.updateCard(token, card.id, patch)
    onUpdated()
  }

  const handleBlurTitle = () => {
    if (title.trim() && title !== card.title) saveField({ title: title.trim() })
  }
  const handleBlurDescription = () => {
    if (description !== card.description) saveField({ description })
  }
  const handleAssigneeChange = (e) => {
    const value = e.target.value
    setAssignee(value)
    saveField({ assignee: value || null })
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    await api.addComment(token, card.id, commentText.trim())
    setCommentText('')
    if (!commentsOpen) setCommentsOpen(true)
    onUpdated()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteCard(token, card.id)
      onDeleted()
    } finally {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><FiX /></button>

        <input
          className="modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlurTitle}
        />

        <div className="modal-field-label">Assignee</div>
        <select className="modal-select" value={assignee} onChange={handleAssigneeChange}>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <div className="modal-field-label">Description</div>
        <textarea
          className="modal-textarea"
          placeholder="Add more detail…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlurDescription}
          rows={4}
        />

        {/* Comments are collapsed by default — click to expand instead of
            always dumping the full thread into the modal. */}
        <div className="modal-field-label">Discussion</div>
        <button
          type="button"
          className="comments-toggle"
          onClick={() => setCommentsOpen((v) => !v)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiMessageSquare size={14} />
            {card.comments.length === 0
              ? 'No comments yet'
              : `${card.comments.length} comment${card.comments.length !== 1 ? 's' : ''}`}
          </span>
          <FiChevronDown className={`comments-toggle-chevron ${commentsOpen ? 'open' : ''}`} />
        </button>

        {commentsOpen && (
          <div className="comments-panel">
            <div className="modal-comments">
              {card.comments.length === 0 && <div className="modal-empty">Be the first to comment.</div>}
              {card.comments.map((c) => (
                <div key={c.id} className="modal-comment">
                  <span className="modal-comment-author">{c.author}</span>
                  <span className="modal-comment-text">{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form className="modal-comment-form" onSubmit={handleAddComment}>
          <input
            placeholder="Write a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="submit">Post</button>
        </form>

        <button className="btn btn-danger modal-delete" onClick={() => setConfirmingDelete(true)}>Delete card</button>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this card?"
          message={`"${card.title}" and its comments will be permanently deleted.`}
          confirmLabel="Delete card"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
