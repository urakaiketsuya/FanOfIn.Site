CREATE TABLE analysis_profiles (
  user_id TEXT NOT NULL,
  deck_fingerprint TEXT NOT NULL,
  deck_identity TEXT,
  revision INTEGER NOT NULL,
  profile_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, deck_fingerprint),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX analysis_profiles_user_identity_updated
  ON analysis_profiles(user_id, deck_identity, updated_at DESC);
