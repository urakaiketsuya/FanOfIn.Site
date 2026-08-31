ALTER TABLE users ADD COLUMN profile_discoverable INTEGER NOT NULL DEFAULT 1 CHECK (profile_discoverable IN (0, 1));

ALTER TABLE user_decks ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'active'
  CHECK (moderation_status IN ('active', 'hidden'));

CREATE TABLE deck_reports (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'copyright', 'other')),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(reporter_user_id, deck_id)
);

CREATE INDEX idx_deck_reports_status_created ON deck_reports(status, created_at);
CREATE INDEX idx_user_decks_moderation_visibility ON user_decks(moderation_status, visibility, published_at DESC);
