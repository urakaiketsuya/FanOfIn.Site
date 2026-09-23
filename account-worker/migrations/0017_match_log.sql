PRAGMA foreign_keys = ON;

CREATE TABLE match_log_records (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  saved_deck_id TEXT REFERENCES user_decks(id) ON DELETE SET NULL,
  played_at TEXT NOT NULL,
  provenance_kind TEXT NOT NULL CHECK (provenance_kind IN ('manual', 'clarent')),
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_match_log_user_played ON match_log_records(user_id, played_at DESC);
CREATE INDEX idx_match_log_user_deck ON match_log_records(user_id, saved_deck_id, played_at DESC);
