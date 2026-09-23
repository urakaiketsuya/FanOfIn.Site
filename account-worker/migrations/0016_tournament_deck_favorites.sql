PRAGMA foreign_keys = ON;

-- Tournament builds live in static pipeline artifacts rather than the account database. Keep a
-- private snapshot so a favorite remains intelligible even when a later data refresh changes or
-- removes the originating event record.
CREATE TABLE tournament_deck_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  champion_name TEXT,
  decklist_json TEXT NOT NULL,
  source_event_id INTEGER,
  source_event_name TEXT,
  source_player_id INTEGER,
  source_player_name TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, deck_hash)
);
CREATE INDEX idx_tournament_deck_favorites_user_created ON tournament_deck_favorites(user_id, created_at DESC);
