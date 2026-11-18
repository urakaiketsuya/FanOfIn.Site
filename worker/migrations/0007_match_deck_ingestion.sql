-- Separate source-scoped match evidence; never mixed into legacy simulator aggregates.
CREATE TABLE submitted_matches (
  id INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  source_match_id TEXT NOT NULL,
  source_version TEXT,
  received_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  format TEXT NOT NULL,
  match_type TEXT NOT NULL,
  best_of INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  winner_seat INTEGER,
  seat_1_wins INTEGER NOT NULL,
  seat_2_wins INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  UNIQUE(source_id, submission_id),
  UNIQUE(source_id, source_match_id)
);
CREATE TABLE submitted_match_decks (
  match_id INTEGER NOT NULL REFERENCES submitted_matches(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL CHECK(seat IN (1, 2)),
  participant_type TEXT NOT NULL,
  source_deck_id TEXT,
  deck_url TEXT,
  deck_name TEXT,
  identity_sha256 TEXT NOT NULL,
  sections_json TEXT NOT NULL,
  PRIMARY KEY(match_id, seat)
);
CREATE INDEX submitted_match_decks_identity ON submitted_match_decks(identity_sha256);
CREATE TABLE submitted_match_games (
  match_id INTEGER NOT NULL REFERENCES submitted_matches(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  source_game_id TEXT,
  outcome TEXT NOT NULL,
  winner_seat INTEGER,
  end_reason TEXT NOT NULL,
  first_player_seat INTEGER,
  turns INTEGER,
  PRIMARY KEY(match_id, game_number)
);
CREATE INDEX submitted_matches_filters ON submitted_matches(source_id, format, match_type, completed_at);
