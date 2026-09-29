CREATE TABLE official_product_deck_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_deck_id TEXT NOT NULL,
  title TEXT NOT NULL,
  champion_name TEXT,
  format TEXT NOT NULL,
  decklist_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, product_deck_id)
);
CREATE INDEX idx_official_product_deck_favorites_user_created ON official_product_deck_favorites(user_id, created_at DESC);
