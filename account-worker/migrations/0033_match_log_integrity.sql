CREATE TABLE match_log_deletions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);

-- Enforce ownership inside the write transaction, including concurrent deck deletion.
CREATE TRIGGER match_log_insert_integrity BEFORE INSERT ON match_log_records BEGIN
  SELECT RAISE(ABORT, 'Match was deleted; refresh your log')
    WHERE EXISTS (SELECT 1 FROM match_log_deletions WHERE user_id = NEW.user_id AND id = NEW.id);
  SELECT RAISE(ABORT, 'Match deck belongs to another account')
    WHERE NEW.saved_deck_id IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM user_decks WHERE id = NEW.saved_deck_id AND owner_user_id = NEW.user_id);
END;
CREATE TRIGGER match_log_update_integrity BEFORE UPDATE ON match_log_records BEGIN
  SELECT RAISE(ABORT, 'Match deck belongs to another account')
    WHERE NEW.saved_deck_id IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM user_decks WHERE id = NEW.saved_deck_id AND owner_user_id = NEW.user_id);
END;
