const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || 'Request failed')
  return data
}

export const api = {
  listProjects: (token) => request('/api/projects', { token }),
  createProject: (token, name) => request('/api/projects', { method: 'POST', token, body: { name } }),
  getBoard: (token, id) => request(`/api/projects/${id}`, { token }),
  renameProject: (token, id, name) =>
    request(`/api/projects/${id}`, { method: 'PATCH', token, body: { name } }),
  deleteProject: (token, id) =>
    request(`/api/projects/${id}`, { method: 'DELETE', token }),
  invite: (token, id, username) =>
    request(`/api/projects/${id}/invite`, { method: 'POST', token, body: { username } }),

  createList: (token, projectId, title) =>
    request(`/api/projects/${projectId}/lists`, { method: 'POST', token, body: { title } }),

  createCard: (token, listId, payload) =>
    request(`/api/projects/lists/${listId}/cards`, { method: 'POST', token, body: payload }),
  updateCard: (token, cardId, payload) =>
    request(`/api/projects/cards/${cardId}`, { method: 'PATCH', token, body: payload }),
  deleteCard: (token, cardId) =>
    request(`/api/projects/cards/${cardId}`, { method: 'DELETE', token }),

  addComment: (token, cardId, text) =>
    request(`/api/projects/cards/${cardId}/comments`, { method: 'POST', token, body: { text } }),

  listNotifications: (token) => request('/api/notifications', { token }),
  markNotificationRead: (token, id) =>
    request(`/api/notifications/${id}/read`, { method: 'POST', token }),
  markAllNotificationsRead: (token) =>
    request('/api/notifications/read-all', { method: 'POST', token }),
}
