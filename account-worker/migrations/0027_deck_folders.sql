CREATE TABLE deck_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  mutation_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, name_key)
);
CREATE INDEX idx_deck_folders_user ON deck_folders(user_id);
CREATE TABLE deck_folder_members (
  folder_id TEXT NOT NULL REFERENCES deck_folders(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES saved_decks(id) ON DELETE CASCADE,
  PRIMARY KEY(folder_id, deck_id)
);
CREATE INDEX idx_deck_folder_members_deck ON deck_folder_members(deck_id);
-- Enforce ownership even if a future writer bypasses the API's checks.
CREATE TRIGGER deck_folder_member_owner BEFORE INSERT ON deck_folder_members
WHEN NOT EXISTS (
  SELECT 1 FROM deck_folders f JOIN saved_decks d ON d.user_id = f.user_id
  WHERE f.id = NEW.folder_id AND d.id = NEW.deck_id
)
BEGIN SELECT RAISE(ABORT, 'Folder and deck owners must match'); END;
