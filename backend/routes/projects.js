import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getUserByUsername,
  createProject,
  getProject,
  getBoard,
  userProjects,
  addMember,
  renameProject,
  deleteProject,
  getProjectProgress,
  getList,
  createList,
  updateList,
  deleteList,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  addComment,
  notifyMembers,
} from "../store.js";

// io is injected so route handlers can broadcast board changes and push
// notifications to everyone currently viewing/interested in that project.
export default function projectRoutes(io) {
  const router = Router();
  router.use(requireAuth);

  const broadcastBoard = (projectId) => {
    io.to(`project:${projectId}`).emit("board-updated", {
      ...getBoard(projectId),
      progress: getProjectProgress(projectId),
    });
  };

  // Records one notification per project member (the actor's own copy is
  // written pre-read) and pushes it live to anyone connected, via their
  // personal `user:<username>` room — so the bell updates instantly
  // whether or not they currently have that project's board open.
  const notifyAll = (project, actorUsername, type, message) => {
    const recipients = project.memberUsernames;
    const rows = notifyMembers(project.id, project.name, recipients, actorUsername, type, message);
    rows.forEach((note, i) => io.to(`user:${recipients[i]}`).emit("notification", note));
  };

  // --- Projects ------------------------------------------------------
  router.get("/", (req, res) => {
    res.json(userProjects(req.user.username));
  });

  router.post("/", (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Project name is required." });
    const project = createProject(name.trim(), req.user.username);
    notifyAll(project, req.user.username, "project-created", `${req.user.username} created "${project.name}"`);
    res.status(201).json(project);
  });

  router.get("/:id", (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: "Project not found." });
    if (!board.memberUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "You're not a member of this project." });
    }
    res.json({ ...board, progress: getProjectProgress(board.id) });
  });

  // Rename the project. Any member can do this — same permission level as
  // renaming a list — but deleting the whole project is owner-only (below).
  router.patch("/:id", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (!project.memberUsernames.includes(req.user.username)) {
      return res.status(403).json({ error: "You're not a member of this project." });
    }
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Project name is required." });

    const oldName = project.name;
    const updated = renameProject(project.id, name.trim());
    notifyAll(updated, req.user.username, "project-renamed", `${req.user.username} renamed "${oldName}" to "${updated.name}"`);
    broadcastBoard(project.id);
    res.json(updated);
  });

  // Only the project owner can delete it — this removes the project and,
  // via ON DELETE CASCADE, every member, list, card, and comment under it.
  router.delete("/:id", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (project.ownerUsername !== req.user.username) {
      return res.status(403).json({ error: "Only the project owner can delete this project." });
    }

    notifyAll(project, req.user.username, "project-deleted", `${req.user.username} deleted "${project.name}"`);
    // Tell anyone with the board open right now to bail out before the data disappears.
    io.to(`project:${project.id}`).emit("project-deleted", { id: project.id, name: project.name });
    deleteProject(project.id);
    res.status(204).end();
  });

  router.post("/:id/invite", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const { username } = req.body;
    if (!getUserByUsername(username)) {
      return res.status(404).json({ error: "No user with that username." });
    }
    const updated = addMember(project.id, username);
    notifyAll(updated, req.user.username, "member-added", `${req.user.username} added ${username} to "${updated.name}"`);
    broadcastBoard(project.id);
    res.json(updated);
  });

  // --- Lists -----------------------------------------------------------
  router.post("/:id/lists", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found." });
    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "List title is required." });

    const list = createList(project.id, title.trim());
    notifyAll(project, req.user.username, "list-created", `${req.user.username} added list "${list.title}" to "${project.name}"`);
    broadcastBoard(project.id);
    res.status(201).json(list);
  });

  router.patch("/lists/:listId", (req, res) => {
    const before = getList(req.params.listId);
    if (!before) return res.status(404).json({ error: "List not found." });
    const list = updateList(req.params.listId, req.body);
    const project = getProject(list.project_id);
    if (req.body.title && req.body.title !== before.title) {
      notifyAll(project, req.user.username, "list-renamed", `${req.user.username} renamed list "${before.title}" to "${list.title}" in "${project.name}"`);
    }
    broadcastBoard(list.project_id);
    res.json(list);
  });

  router.delete("/lists/:listId", (req, res) => {
    const list = getList(req.params.listId);
    if (!list) return res.status(404).json({ error: "List not found." });
    const project = getProject(list.project_id);
    deleteList(list.id);
    notifyAll(project, req.user.username, "list-deleted", `${req.user.username} deleted list "${list.title}" from "${project.name}"`);
    broadcastBoard(list.project_id);
    res.status(204).end();
  });

  // --- Cards -----------------------------------------------------------
  router.post("/lists/:listId/cards", (req, res) => {
    const list = getList(req.params.listId);
    if (!list) return res.status(404).json({ error: "List not found." });
    const { title, description, assignee } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Card title is required." });

    const card = createCard(list.id, list.project_id, { title: title.trim(), description, assignee });
    const project = getProject(list.project_id);
    notifyAll(project, req.user.username, "card-created", `${req.user.username} added card "${card.title}" to "${list.title}" in "${project.name}"`);
    broadcastBoard(list.project_id);
    res.status(201).json(card);
  });

  // Also handles moving a card between lists (drag & drop) via listId/order in body
  router.patch("/cards/:cardId", (req, res) => {
    const existing = getCard(req.params.cardId);
    if (!existing) return res.status(404).json({ error: "Card not found." });

    const fromListId = existing.list_id;
    const progressBefore = getProjectProgress(existing.project_id);

    const card = updateCard(existing.id, req.body);
    const project = getProject(card.project_id);

    // A list change is "progress" — the card moved somewhere on the
    // board — so it gets its own message distinct from a plain edit.
    if (req.body.listId && req.body.listId !== fromListId) {
      const toList = getList(card.list_id);
      notifyAll(project, req.user.username, "card-moved", `${req.user.username} moved "${card.title}" to "${toList.title}" in "${project.name}"`);

      const progressAfter = getProjectProgress(project.id);
      if (progressAfter.percent === 100 && progressBefore.percent !== 100 && progressAfter.total > 0) {
        notifyAll(project, req.user.username, "project-completed", `🎉 "${project.name}" is complete — every card is in Done`);
      }
    } else if (req.body.title || req.body.description !== undefined || req.body.assignee !== undefined) {
      notifyAll(project, req.user.username, "card-updated", `${req.user.username} updated "${card.title}" in "${project.name}"`);
    }

    broadcastBoard(card.project_id);
    res.json(card);
  });

  router.delete("/cards/:cardId", (req, res) => {
    const card = getCard(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found." });
    const project = getProject(card.project_id);
    deleteCard(card.id);
    notifyAll(project, req.user.username, "card-deleted", `${req.user.username} deleted card "${card.title}" from "${project.name}"`);
    broadcastBoard(card.project_id);
    res.status(204).end();
  });

  // --- Comments --------------------------------------------------------
  router.post("/cards/:cardId/comments", (req, res) => {
    const card = getCard(req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found." });
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Comment text is required." });

    const comment = addComment(card.id, req.user.username, text.trim());
    const project = getProject(card.project_id);
    notifyAll(project, req.user.username, "comment-added", `${req.user.username} commented on "${card.title}" in "${project.name}"`);
    broadcastBoard(card.project_id);
    res.status(201).json(comment);
  });

  return router;
}
