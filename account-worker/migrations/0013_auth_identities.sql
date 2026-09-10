CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
  provider_subject TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 1 CHECK (email_verified IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, provider_subject),
  UNIQUE(user_id, provider)
);
CREATE INDEX idx_auth_identities_user ON auth_identities(user_id);

INSERT INTO auth_identities (id, user_id, provider, provider_subject, provider_email, email_verified, created_at, updated_at)
SELECT lower(hex(randomblob(16))), id, 'google', google_subject, email, 1, created_at, updated_at
FROM users;

CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('discord')),
  purpose TEXT NOT NULL CHECK (purpose IN ('sign-in', 'link')),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_oauth_states_expiry ON oauth_states(expires_at);
