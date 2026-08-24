ALTER TABLE game_submissions ADD COLUMN raw_payload_json TEXT;
ALTER TABLE game_submissions ADD COLUMN raw_payload_expires_at TEXT;

CREATE INDEX idx_game_submissions_raw_payload_expiry
  ON game_submissions(raw_payload_expires_at)
  WHERE raw_payload_json IS NOT NULL;
