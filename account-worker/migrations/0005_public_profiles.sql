PRAGMA foreign_keys = ON;

-- Profile URLs must not change when a user edits their display name, and must
-- not reveal the internal user ID or Google identity.
ALTER TABLE users ADD COLUMN profile_slug TEXT;
UPDATE users SET profile_slug = lower(hex(randomblob(12))) WHERE profile_slug IS NULL;
CREATE UNIQUE INDEX idx_users_profile_slug ON users(profile_slug);

CREATE INDEX idx_user_decks_public_discovery
  ON user_decks(visibility, published_at DESC, id);
