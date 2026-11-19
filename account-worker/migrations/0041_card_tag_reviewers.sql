CREATE TABLE card_tag_reviewers (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
