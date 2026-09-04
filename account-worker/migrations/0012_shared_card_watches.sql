-- Cards the owner has flagged for cross-deck sharing checks, independent of `collection_entries`'
-- quantity bookkeeping (that table deletes a row once owned/proxy quantity both hit 0, which would
-- silently drop a watch flag stored alongside it).
CREATE TABLE shared_card_watches (
  user_id TEXT NOT NULL REFERENCES users(id),
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_uuid)
);
