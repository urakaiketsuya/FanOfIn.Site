PRAGMA foreign_keys = ON;

-- Canonical card data is separated from a user's named deck record so identical
-- builds can eventually be shared without sharing ownership or private metadata.
CREATE TABLE canonical_builds (
  id TEXT PRIMARY KEY,
  core_identity_hash TEXT NOT NULL,
  full_identity_hash TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL CHECK (format IN ('STANDARD', 'PANTHEON', 'UNKNOWN')),
  champion_name TEXT,
  decklist_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_canonical_builds_core_hash ON canonical_builds(core_identity_hash);

CREATE TABLE user_decks (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  format TEXT NOT NULL CHECK (format IN ('STANDARD', 'PANTHEON', 'UNKNOWN')),
  champion_name TEXT,
  current_version_id TEXT,
  published_version_id TEXT,
  copied_from_deck_id TEXT REFERENCES user_decks(id) ON DELETE SET NULL,
  copied_from_version_id TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_user_decks_owner_updated ON user_decks(owner_user_id, updated_at DESC);
CREATE INDEX idx_user_decks_visibility_published ON user_decks(visibility, published_at DESC);

CREATE TABLE deck_versions (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  canonical_build_id TEXT NOT NULL REFERENCES canonical_builds(id),
  change_note TEXT NOT NULL DEFAULT '',
  change_summary_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  UNIQUE(deck_id, version_number)
);
CREATE INDEX idx_deck_versions_deck_number ON deck_versions(deck_id, version_number DESC);

-- Preserve every existing deck as private. Legacy canonical IDs are deliberately
-- unique per saved deck because SQL cannot reproduce the application SHA-256 full
-- hash during migration; the next content save will use the true canonical hash.
INSERT INTO canonical_builds (id, core_identity_hash, full_identity_hash, format, champion_name, decklist_json, created_at)
SELECT 'legacy:' || id, identity_hash, 'legacy:' || id, format, champion_name, decklist_json, created_at
FROM saved_decks;

INSERT INTO user_decks (id, owner_user_id, title, visibility, format, champion_name, created_at, updated_at)
SELECT id, user_id, title, 'private', format, champion_name, created_at, updated_at
FROM saved_decks;

INSERT INTO deck_versions (id, deck_id, version_number, canonical_build_id, change_note, change_summary_json, created_at)
SELECT lower(hex(randomblob(16))), id, 1, 'legacy:' || id, 'Imported from saved decks', '{}', created_at
FROM saved_decks;

UPDATE user_decks
SET current_version_id = (
  SELECT id FROM deck_versions WHERE deck_versions.deck_id = user_decks.id AND version_number = 1
);
