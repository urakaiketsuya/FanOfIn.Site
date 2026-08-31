PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE external_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('omnidex', 'shoutatyourdecks')),
  external_identifier TEXT NOT NULL,
  normalized_identifier TEXT NOT NULL,
  display_name TEXT NOT NULL,
  last_imported_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, provider, normalized_identifier)
);

CREATE TABLE saved_decks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identity_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('STANDARD', 'PANTHEON', 'UNKNOWN')),
  champion_name TEXT,
  decklist_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, identity_hash)
);
CREATE INDEX idx_saved_decks_user_updated ON saved_decks(user_id, updated_at DESC);

CREATE TABLE saved_deck_sources (
  id TEXT PRIMARY KEY,
  saved_deck_id TEXT NOT NULL REFERENCES saved_decks(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('manual', 'omnidex', 'shoutatyourdecks')),
  external_deck_id TEXT NOT NULL,
  source_url TEXT,
  label TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  sideboard_json TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  UNIQUE(saved_deck_id, provider, external_deck_id)
);
CREATE INDEX idx_saved_deck_sources_deck ON saved_deck_sources(saved_deck_id);
