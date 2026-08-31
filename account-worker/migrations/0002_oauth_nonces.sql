CREATE TABLE oauth_nonces (
  nonce_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_oauth_nonces_expiry ON oauth_nonces(expires_at);
