# CodeAlpha_ProjectManagementTool

A Trello/Asana-style collaborative project management tool built for
CodeAlpha's Full Stack Development internship (Task 3). Projects have
boards with lists (To Do / In Progress / Done) and cards you can drag
between them, assign, and comment on — with real-time updates across
everyone viewing the same project, using the Socket.io setup we already
built for Task 4.

## Stack

- **Frontend:** React 19 + Vite, React Router, Socket.io client
- **Backend:** Node.js, Express, Socket.io (real-time board sync), JWT auth

## Run it locally

Open two terminals.

```bash
# Terminal 1 — backend
cd backend
npm install
cp .env.example .env
npm run dev
```

```bash
# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:5174`, register an account, create a project —
you'll get a board with three default lists. Open the same project URL in
a second browser tab/window signed in as a different user (use **Invite**
on the board to add them) to see cards update live in both tabs.

## Accounts

Signing up asks for your full name, a username, email, and password
(plus confirming it and agreeing to the [Privacy Policy](frontend/src/pages/PrivacyPolicy.jsx)).
Signing in afterward uses your **email**, not your username — the
username is still what shows up as the assignee/owner/member on boards.

A welcome email goes out to the address you signed up with. Without any
SMTP configuration, Flowboard just logs that email to the backend
console instead of sending it — so registration works out of the box in
dev. To actually send it, fill in `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`
(and `SMTP_PORT` / `SMTP_FROM`) in `backend/.env` — see the comments in
`backend/.env.example` for a Gmail App Password walkthrough, or use
[Ethereal](https://ethereal.email) for a free disposable test inbox.

## How the pieces fit together

- `backend/store.js` — in-memory data model for users, projects, lists,
  and cards. Swap each `Map` for a real database collection/table later.
- `backend/routes/projects.js` — REST endpoints for every board mutation
  (create list, add card, move card, comment, etc). Each one calls
  `broadcastBoard()` afterward, which emits the updated board over
  Socket.io to everyone in that project's room — that's the real-time layer.
- `frontend/src/pages/Board.jsx` — the board UI: draggable cards between
  list columns, plus a socket listener that replaces the board state
  whenever a `board-updated` event arrives, so changes from teammates
  appear instantly without a refresh.
- `frontend/src/components/CardModal.jsx` — card detail view: title,
  description, assignee, and comments.

## Before you submit — hardening checklist

- [x] ~~Swap the in-memory store + fake password hash for a real database + bcrypt~~ — done. Uses SQLite (`backend/flowboard.db`, created automatically) via Node's built-in `node:sqlite` module, and real bcrypt password hashing.
- [x] ~~Restrict CORS to your deployed frontend origin~~ — done. Set `FRONTEND_ORIGIN` in `backend/.env` (defaults to `http://localhost:5174` for local dev; comma-separate multiple origins if needed).
- [ ] Add pagination/limits if projects can grow large (not needed for a demo)
- [ ] Record your LinkedIn demo (create a project, add cards, drag between lists, invite a teammate, comment, show it updating live in two tabs)
- [ ] Push to GitHub as `CodeAlpha_ProjectManagementTool` — **the `.gitignore` already excludes `flowboard.db`**, so your data won't accidentally end up in the repo

## Data persistence

Everything (accounts, projects, boards, cards, comments) is stored in `backend/flowboard.db`, a real SQLite database file created automatically the first time the server runs. Restarting the server no longer wipes your data — stop it, start it again, your accounts and boards are still there. Delete `flowboard.db` if you ever want to wipe everything and start clean.

`node:sqlite` is a newer built-in Node.js feature (no separate install, no native compilation needed — unlike `better-sqlite3`, which requires Visual Studio Build Tools on Windows). You'll see an `ExperimentalWarning: SQLite is an experimental feature` message when the server starts — that's expected and harmless, not an error.

## Bonus features already included

- **Real-time updates** — every board change (new card, moved card, new
  comment, new member) pushes to all connected clients instantly.
- Room-based Socket.io joins so updates only go to people actually viewing
  that project, not every connected user.
- **Delete & rename projects** — the project owner can delete a project
  (cascades to its lists, cards, and comments); any member can rename it
  from the board title.
- **Notifications** — every project change (created, renamed, invited,
  list/card added or moved, comment posted, project completed or deleted)
  notifies every member in real time via the bell in the navbar, with
  unread counts and a "mark all read" action. Notifications are stored
  server-side, so they're still there next time you log in.
- **Export to PDF / Word** — export a single board (from the board page)
  or a summary of every project you're on (from the Projects page) as a
  `.pdf` or `.docx` file, generated entirely client-side.
