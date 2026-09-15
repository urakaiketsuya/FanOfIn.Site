PRAGMA foreign_keys = ON;

CREATE TABLE user_combos (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_slug TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  definition_json TEXT NOT NULL,
  definition_hash TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (format IN ('STANDARD', 'PANTHEON', 'UNKNOWN')),
  champion_name TEXT,
  example_deck_id TEXT REFERENCES user_decks(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_user_combos_owner_updated ON user_combos(owner_user_id, updated_at DESC);
CREATE INDEX idx_user_combos_owner_definition ON user_combos(owner_user_id, definition_hash);
CREATE INDEX idx_user_combos_discover ON user_combos(visibility, updated_at DESC);

CREATE TABLE combo_bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  combo_id TEXT NOT NULL REFERENCES user_combos(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, combo_id)
);
CREATE INDEX idx_combo_bookmarks_user_created ON combo_bookmarks(user_id, created_at DESC);
