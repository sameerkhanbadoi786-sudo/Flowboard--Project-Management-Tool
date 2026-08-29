import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

// ---------------------------------------------------------------------------
// SQLite-backed data layer (via Node's built-in node:sqlite — no native
// compilation required). Every function here does one job and returns
// plain JS objects — routes never touch SQL directly.
// ---------------------------------------------------------------------------

// --- Users -----------------------------------------------------------
export function getUserByUsername(username) {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username);
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function createUser({ fullName, username, email, password }) {
  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (id, username, full_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, username, fullName, email, passwordHash, Date.now());
  return { id, username, fullName, email };
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

// --- Projects ----------------------------------------------------------
export function createProject(name, ownerUsername) {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO projects (id, name, owner_username, created_at) VALUES (?, ?, ?, ?)"
  ).run(id, name, ownerUsername, Date.now());

  db.prepare("INSERT INTO project_members (project_id, username) VALUES (?, ?)").run(id, ownerUsername);

  // Every new project starts with a standard three-column board.
  const insertList = db.prepare(
    "INSERT INTO lists (id, project_id, title, order_index) VALUES (?, ?, ?, ?)"
  );
  ["To Do", "In Progress", "Done"].forEach((title, i) => {
    insertList.run(uuidv4(), id, title, i);
  });

  return getProject(id);
}

export function getProject(projectId) {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!project) return null;
  const members = db
    .prepare("SELECT username FROM project_members WHERE project_id = ?")
    .all(projectId)
    .map((r) => r.username);
  return {
    id: project.id,
    name: project.name,
    ownerUsername: project.owner_username,
    memberUsernames: members,
  };
}

export function userProjects(username) {
  const rows = db
    .prepare(
      `SELECT p.* FROM projects p
       JOIN project_members m ON m.project_id = p.id
       WHERE m.username = ?
       ORDER BY p.created_at DESC`
    )
    .all(username);
  return rows.map((p) => ({ ...getProject(p.id), progress: getProjectProgress(p.id) }));
}

export function addMember(projectId, username) {
  db.prepare(
    "INSERT OR IGNORE INTO project_members (project_id, username) VALUES (?, ?)"
  ).run(projectId, username);
  return getProject(projectId);
}

export function isMember(projectId, username) {
  return !!db
    .prepare("SELECT 1 FROM project_members WHERE project_id = ? AND username = ?")
    .get(projectId, username);
}

export function renameProject(projectId, name) {
  db.prepare("UPDATE projects SET name = ? WHERE id = ?").run(name, projectId);
  return getProject(projectId);
}

// Deleting the project row cascades (via the FK ON DELETE CASCADE
// constraints declared in db.js) to project_members, lists, cards, and
// comments in one go — no manual cleanup needed here.
export function deleteProject(projectId) {
  db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
}

// --- Board (project + lists + cards + comments, nested) ---------------
export function getBoard(projectId) {
  const project = getProject(projectId);
  if (!project) return null;

  const listRows = db
    .prepare("SELECT * FROM lists WHERE project_id = ? ORDER BY order_index")
    .all(projectId);

  const cardStmt = db.prepare("SELECT * FROM cards WHERE list_id = ? ORDER BY order_index");
  const commentStmt = db.prepare("SELECT * FROM comments WHERE card_id = ? ORDER BY at");

  const lists = listRows.map((list) => ({
    id: list.id,
    projectId: list.project_id,
    title: list.title,
    order: list.order_index,
    cards: cardStmt.all(list.id).map((card) => ({
      id: card.id,
      listId: card.list_id,
      projectId: card.project_id,
      title: card.title,
      description: card.description,
      assignee: card.assignee,
      order: card.order_index,
      comments: commentStmt.all(card.id).map((c) => ({
        id: c.id,
        author: c.author,
        text: c.text,
        at: c.at,
      })),
    })),
  }));

  return { ...project, lists };
}

// Computes how "done" a project is: cards sitting in a list titled "Done"
// (case-insensitive) divided by total cards across the whole project.
export function getProjectProgress(projectId) {
  const total = db.prepare("SELECT COUNT(*) as n FROM cards WHERE project_id = ?").get(projectId).n;
  const done = db
    .prepare(
      `SELECT COUNT(*) as n FROM cards c
       JOIN lists l ON l.id = c.list_id
       WHERE c.project_id = ? AND LOWER(TRIM(l.title)) = 'done'`
    )
    .get(projectId).n;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}

// --- Lists ------------------------------------------------------------
export function getList(listId) {
  return db.prepare("SELECT * FROM lists WHERE id = ?").get(listId);
}

export function createList(projectId, title) {
  const count = db.prepare("SELECT COUNT(*) as n FROM lists WHERE project_id = ?").get(projectId).n;
  const id = uuidv4();
  db.prepare("INSERT INTO lists (id, project_id, title, order_index) VALUES (?, ?, ?, ?)").run(
    id, projectId, title, count
  );
  return getList(id);
}

export function updateList(listId, patch) {
  const list = getList(listId);
  if (!list) return null;
  const title = patch.title ?? list.title;
  const order = patch.order ?? list.order_index;
  db.prepare("UPDATE lists SET title = ?, order_index = ? WHERE id = ?").run(title, order, listId);
  return getList(listId);
}

export function deleteList(listId) {
  db.prepare("DELETE FROM cards WHERE list_id = ?").run(listId); // manual cascade
  db.prepare("DELETE FROM lists WHERE id = ?").run(listId);
}

// --- Cards --------------------------------------------------------------
export function getCard(cardId) {
  return db.prepare("SELECT * FROM cards WHERE id = ?").get(cardId);
}

export function createCard(listId, projectId, { title, description, assignee }) {
  const count = db.prepare("SELECT COUNT(*) as n FROM cards WHERE list_id = ?").get(listId).n;
  const id = uuidv4();
  db.prepare(
    "INSERT INTO cards (id, list_id, project_id, title, description, assignee, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, listId, projectId, title, description || "", assignee || null, count);
  return getCard(id);
}

export function updateCard(cardId, patch) {
  const card = getCard(cardId);
  if (!card) return null;
  const next = {
    list_id: patch.listId ?? card.list_id,
    title: patch.title ?? card.title,
    description: patch.description ?? card.description,
    assignee: patch.assignee !== undefined ? patch.assignee : card.assignee,
    order_index: patch.order ?? card.order_index,
  };
  db.prepare(
    "UPDATE cards SET list_id = ?, title = ?, description = ?, assignee = ?, order_index = ? WHERE id = ?"
  ).run(next.list_id, next.title, next.description, next.assignee, next.order_index, cardId);
  return getCard(cardId);
}

export function deleteCard(cardId) {
  db.prepare("DELETE FROM comments WHERE card_id = ?").run(cardId); // manual cascade
  db.prepare("DELETE FROM cards WHERE id = ?").run(cardId);
}

// --- Comments ------------------------------------------------------------
export function addComment(cardId, author, text) {
  const id = uuidv4();
  const at = Date.now();
  db.prepare("INSERT INTO comments (id, card_id, author, text, at) VALUES (?, ?, ?, ?, ?)").run(
    id, cardId, author, text, at
  );
  return { id, author, text, at };
}

// --- Notifications ---------------------------------------------------------
// One row per recipient per event, so each member's read/unread state is
// tracked independently. The actor's own copy is written already-read —
// they were just there watching it happen, so it's an activity record for
// them rather than something waiting on their attention.
function toNotification(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    actor: row.actor_username,
    type: row.type,
    message: row.message,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

export function notifyMembers(projectId, projectName, memberUsernames, actorUsername, type, message) {
  const insert = db.prepare(
    `INSERT INTO notifications
       (id, project_id, project_name, recipient_username, actor_username, type, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const createdAt = Date.now();
  const rows = [];
  for (const recipient of memberUsernames) {
    const id = uuidv4();
    const isRead = recipient === actorUsername ? 1 : 0;
    insert.run(id, projectId, projectName, recipient, actorUsername, type, message, isRead, createdAt);
    rows.push(toNotification({
      id, project_id: projectId, project_name: projectName, recipient_username: recipient,
      actor_username: actorUsername, type, message, is_read: isRead, created_at: createdAt,
    }));
  }
  return rows; // one entry per recipient, in the same order as memberUsernames
}

export function listNotifications(username, limit = 50) {
  const rows = db
    .prepare(
      `SELECT * FROM notifications WHERE recipient_username = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(username, limit);
  return rows.map(toNotification);
}

export function unreadNotificationCount(username) {
  return db
    .prepare("SELECT COUNT(*) as n FROM notifications WHERE recipient_username = ? AND is_read = 0")
    .get(username).n;
}

export function markNotificationRead(id, username) {
  db.prepare(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_username = ?"
  ).run(id, username);
}

export function markAllNotificationsRead(username) {
  db.prepare(
    "UPDATE notifications SET is_read = 1 WHERE recipient_username = ? AND is_read = 0"
  ).run(username);
}
