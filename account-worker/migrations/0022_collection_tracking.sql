-- Reminders survive zero inventory; borrower names remain private to the owner.
CREATE TABLE collection_card_tracking (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  might_own INTEGER NOT NULL DEFAULT 0 CHECK (might_own IN (0, 1)),
  loans_json TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_uuid)
);
