# Flowboard — Project Management Tool

A Trello/Asana-style collaborative project management tool. Projects have
boards with lists (To Do / In Progress / Done) and cards you can drag
between them, assign, and comment on — with real-time updates across
everyone viewing the same project, powered by Socket.io.

## Stack

- **Frontend:** React 19 + Vite, React Router 7, Socket.io client, `jspdf` + `docx` for exports
- **Backend:** Node.js, Express, Socket.io (real-time board sync), JWT auth, `node:sqlite` for storage, `bcryptjs` for password hashing, Resend for transactional email

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

A welcome email goes out to the address you signed up with, sent via
[Resend](https://resend.com). Without a `RESEND_API_KEY`, Flowboard just
logs the welcome email to the backend console instead of sending it — so
registration works out of the box in dev. To actually send it:

1. Create a free Resend account and grab an API key.
2. Set `RESEND_API_KEY` in `backend/.env`.
3. Optionally set `RESEND_FROM` to a verified sending address — until you
   verify your own domain on Resend, the default `onboarding@resend.dev`
   sender can only deliver to the email address you signed up to Resend
   with.

## How the pieces fit together

- `backend/db.js` — SQLite schema (`backend/flowboard.db`, created and
  migrated automatically) via Node's built-in `node:sqlite` module: users,
  projects, members, lists, cards, comments, and notifications.
- `backend/routes/projects.js` — REST endpoints for every board mutation
  (create list, add card, move card, comment, etc). Each one calls
  `broadcastBoard()` afterward, which emits the updated board over
  Socket.io to everyone in that project's room — that's the real-time layer.
- `backend/routes/notifications.js` — REST endpoints for fetching,
  marking-read, and marking-all-read on a user's notifications.
- `backend/lib/mailer.js` — builds and sends the welcome email via Resend,
  falling back to a console log when no API key is configured.
- `frontend/src/pages/Board.jsx` — the board UI: draggable cards between
  list columns, plus a socket listener that replaces the board state
  whenever a `board-updated` event arrives, so changes from teammates
  appear instantly without a refresh.
- `frontend/src/components/CardModal.jsx` — card detail view: title,
  description, assignee, and comments.
- `frontend/src/components/Navbar.jsx` + `NotificationBell.jsx` — top nav
  with route links, theme toggle, notification bell, and a mobile
  hamburger menu that collapses everything into a dropdown under ~720px.

## Data persistence

Everything (accounts, projects, boards, cards, comments, notifications) is
stored in `backend/flowboard.db`, a real SQLite database file created
automatically the first time the server runs. Restarting the server
doesn't wipe your data — stop it, start it again, your accounts and boards
are still there. Delete `flowboard.db` if you ever want to wipe everything
and start clean.

`node:sqlite` is a newer built-in Node.js feature (no separate install, no
native compilation needed — unlike `better-sqlite3`, which requires Visual
Studio Build Tools on Windows). You'll see an `ExperimentalWarning: SQLite
is an experimental feature` message when the server starts — that's
expected and harmless, not an error.

## Features

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
- **Light/dark theme toggle**, persisted per user.
- **Responsive navbar** — collapses into a hamburger dropdown on mobile,
  with the notification bell and menu pinned to the right edge.

## Project structure

```
Project Management/
├── backend/
│   ├── db.js              # SQLite schema + migrations
│   ├── server.js          # Express app + Socket.io server
│   ├── store.js           # Query helpers over the SQLite tables
│   ├── lib/mailer.js       # Resend welcome-email sender
│   ├── middleware/         # JWT auth middleware
│   └── routes/             # auth, projects, notifications REST endpoints
└── frontend/
    └── src/
        ├── components/     # Navbar, NotificationBell, CardModal, ExportMenu, ...
        ├── context/        # Auth, Theme, Notifications React contexts
        ├── pages/          # Home, Login, Register, Projects, Board, Tools, PrivacyPolicy
        ├── lib/             # api client, socket client, export helpers
        └── styles/          # per-component CSS
```

## Known gaps / not yet done

- No pagination/limits on projects or boards yet (fine for a demo, would
  matter at scale).
- `backend/.env.example` previously referenced SMTP variables from an
  earlier version of the mailer — it's been updated to `RESEND_API_KEY` /
  `RESEND_FROM` to match `lib/mailer.js`.
