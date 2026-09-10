CREATE TABLE password_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  normalized_email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  hash_algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256' CHECK (hash_algorithm = 'pbkdf2-sha256'),
  hash_iterations INTEGER NOT NULL CHECK (hash_iterations >= 600000),
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_password_credentials_user ON password_credentials(user_id);

CREATE TABLE password_auth_tokens (
  token_hash TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL REFERENCES password_credentials(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify-email', 'reset-password')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_password_auth_tokens_credential ON password_auth_tokens(credential_id, purpose);
CREATE INDEX idx_password_auth_tokens_expiry ON password_auth_tokens(expires_at);

CREATE TABLE auth_security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  identifier_hash TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_auth_security_events_user_created ON auth_security_events(user_id, created_at DESC);
CREATE INDEX idx_auth_security_events_type_created ON auth_security_events(event_type, created_at DESC);

CREATE TABLE email_suppressions (
  normalized_email TEXT PRIMARY KEY,
  reason TEXT NOT NULL CHECK (reason IN ('bounced', 'complained', 'suppressed')),
  created_at TEXT NOT NULL
);

CREATE TABLE email_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_email_webhook_events_created ON email_webhook_events(created_at);

ALTER TABLE sessions ADD COLUMN authenticated_at TEXT;
UPDATE sessions SET authenticated_at = created_at WHERE authenticated_at IS NULL;
