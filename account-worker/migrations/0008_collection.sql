PRAGMA foreign_keys = ON;

CREATE TABLE collection_entries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0 AND owned_quantity <= 9999),
  proxy_quantity INTEGER NOT NULL DEFAULT 0 CHECK (proxy_quantity >= 0 AND proxy_quantity <= 9999),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_uuid)
);
CREATE INDEX idx_collection_entries_user_name ON collection_entries(user_id, card_name COLLATE NOCASE);

CREATE TABLE collection_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  changes_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  undone_at TEXT
);
CREATE INDEX idx_collection_transactions_user_created ON collection_transactions(user_id, created_at DESC);
