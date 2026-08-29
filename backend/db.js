import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// node:sqlite ships inside Node.js itself (Node 22.5+) — nothing to
// compile, nothing extra to install. Creates flowboard.db right next to
// this file the first time the server runs; everything persists across
// restarts from here on. Delete the file to wipe all data and start fresh.
export const db = new DatabaseSync(path.join(__dirname, "flowboard.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_username TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_members (
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    PRIMARY KEY (project_id, username)
  );

  CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assignee TEXT,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    at INTEGER NOT NULL
  );

  -- Notifications are intentionally NOT foreign-keyed to projects: they're
  -- an activity record that should survive a project being deleted (so
  -- "Project X was deleted" stays readable), so project_name is captured
  -- at write time instead of joined at read time.
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    project_name TEXT NOT NULL,
    recipient_username TEXT NOT NULL,
    actor_username TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON notifications (recipient_username, created_at DESC);
`);

// node:sqlite doesn't enforce foreign keys or cascade deletes by default —
// turn that on so deleting a project/list/card cleans up its children.
db.exec("PRAGMA foreign_keys = ON;");

// --- Migrations for DBs created before a column existed --------------------
// CREATE TABLE IF NOT EXISTS is a no-op on an existing table, so a
// flowboard.db created by an earlier version of this app won't have
// full_name/email yet. Add them if missing so upgrading doesn't require
// deleting your data.
function ensureColumn(table, column, addColumnDdl) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${addColumnDdl}`);
  }
}
ensureColumn("users", "full_name", "full_name TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "email", "email TEXT");

db.exec("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);");

export default db;
