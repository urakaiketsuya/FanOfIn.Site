PRAGMA foreign_keys = ON;

CREATE TABLE game_submissions (
  submission_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  match_id TEXT NOT NULL,
  game_number INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  source_version TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  r2_object_key TEXT NOT NULL,
  processing_status TEXT NOT NULL CHECK (processing_status IN ('complete', 'failed')),
  UNIQUE (match_id, game_number)
);

CREATE INDEX idx_game_submissions_received_at ON game_submissions(received_at);
CREATE INDEX idx_game_submissions_status ON game_submissions(processing_status);

CREATE TABLE games (
  submission_id TEXT PRIMARY KEY REFERENCES game_submissions(submission_id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  format TEXT NOT NULL,
  best_of INTEGER NOT NULL,
  winner INTEGER NOT NULL,
  first_player INTEGER NOT NULL,
  turns INTEGER NOT NULL,
  match_winner INTEGER NOT NULL,
  player_1_match_wins INTEGER NOT NULL,
  player_2_match_wins INTEGER NOT NULL
);

CREATE INDEX idx_games_format ON games(format);
CREATE INDEX idx_games_winner_first_player ON games(winner, first_player);

CREATE TABLE game_players (
  submission_id TEXT NOT NULL REFERENCES game_submissions(submission_id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  deck_link TEXT NOT NULL,
  champion_id TEXT NOT NULL,
  element TEXT NOT NULL,
  classes_json TEXT NOT NULL,
  end_level INTEGER NOT NULL,
  end_hp INTEGER NOT NULL,
  PRIMARY KEY (submission_id, seat)
);

CREATE INDEX idx_game_players_champion ON game_players(champion_id);
CREATE INDEX idx_game_players_element ON game_players(element);
