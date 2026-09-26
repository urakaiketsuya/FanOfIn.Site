ALTER TABLE users ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1));
ALTER TABLE user_decks ADD COLUMN is_seed INTEGER NOT NULL DEFAULT 0 CHECK (is_seed IN (0, 1));
ALTER TABLE user_decks ADD COLUMN seed_discoverable INTEGER NOT NULL DEFAULT 1 CHECK (seed_discoverable IN (0, 1));

-- Internal provenance is intentionally separate from public deck metadata.
CREATE TABLE starter_library_sources (
  deck_id TEXT PRIMARY KEY REFERENCES user_decks(id) ON DELETE CASCADE,
  provenance_json TEXT NOT NULL
);
