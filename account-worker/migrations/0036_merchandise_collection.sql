CREATE TABLE merchandise_collections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  quantities_json TEXT NOT NULL,
  request_id TEXT NOT NULL,
  expected_revision INTEGER NOT NULL
);
