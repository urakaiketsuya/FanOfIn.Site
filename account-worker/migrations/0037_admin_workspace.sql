CREATE TABLE admin_users (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE editorial_packages (
  id TEXT PRIMARY KEY,
  definition_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published')),
  revision INTEGER NOT NULL CHECK (revision > 0),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX editorial_packages_status ON editorial_packages(status, updated_at);
