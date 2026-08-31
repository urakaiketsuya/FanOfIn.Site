PRAGMA foreign_keys = ON;

CREATE TABLE deck_likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, deck_id)
);
CREATE INDEX idx_deck_likes_deck ON deck_likes(deck_id);

-- A bookmark deliberately pins the published version visible when it was saved.
CREATE TABLE deck_bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES deck_versions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, deck_id)
);
CREATE INDEX idx_deck_bookmarks_user_created ON deck_bookmarks(user_id, created_at DESC);
