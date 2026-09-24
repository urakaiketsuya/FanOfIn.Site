-- Printing-aware inventory lives beside legacy canonical rows so existing collections migrate
-- without rewriting or guessing a printing. Deck coverage pools both tables by card identity.
CREATE TABLE collection_printing_entries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  edition_uuid TEXT NOT NULL,
  set_prefix TEXT,
  collector_number TEXT,
  owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0 AND owned_quantity <= 9999),
  proxy_quantity INTEGER NOT NULL DEFAULT 0 CHECK (proxy_quantity >= 0 AND proxy_quantity <= 9999),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, edition_uuid)
);

CREATE INDEX idx_collection_printings_user_card ON collection_printing_entries(user_id, card_uuid);
CREATE INDEX idx_collection_printings_user_name ON collection_printing_entries(user_id, card_name COLLATE NOCASE);
