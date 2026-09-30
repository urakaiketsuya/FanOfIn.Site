ALTER TABLE user_decks ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
-- Every existing metadata/publication path also invalidates stale editors.
CREATE TRIGGER user_deck_revision AFTER UPDATE ON user_decks
WHEN NEW.revision = OLD.revision
BEGIN
  UPDATE user_decks SET revision = OLD.revision + 1 WHERE id = NEW.id;
END;

CREATE TABLE deck_save_receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  deck_id TEXT NOT NULL REFERENCES user_decks(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  expected_revision INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, request_id)
);
-- A failed guard aborts the entire batch, including dependent writes.
CREATE TRIGGER deck_save_snapshot BEFORE INSERT ON deck_save_receipts
BEGIN
  SELECT RAISE(ABORT, 'deck_revision_conflict') WHERE NOT EXISTS (
    SELECT 1 FROM user_decks WHERE id = NEW.deck_id AND owner_user_id = NEW.user_id AND revision = NEW.expected_revision
  );
END;

CREATE TRIGGER saved_deck_quota BEFORE INSERT ON saved_decks
WHEN NOT EXISTS (SELECT 1 FROM saved_decks WHERE user_id = NEW.user_id AND identity_hash = NEW.identity_hash)
BEGIN
  SELECT RAISE(ABORT, 'deck_limit_reached') WHERE (SELECT COUNT(*) FROM saved_decks WHERE user_id = NEW.user_id) >= 250;
END;
CREATE TRIGGER saved_deck_source_quota BEFORE INSERT ON saved_deck_sources
WHEN NOT EXISTS (SELECT 1 FROM saved_deck_sources WHERE saved_deck_id = NEW.saved_deck_id AND provider = NEW.provider AND external_deck_id = NEW.external_deck_id)
BEGIN
  SELECT RAISE(ABORT, 'deck_source_limit_reached') WHERE (SELECT COUNT(*) FROM saved_deck_sources WHERE saved_deck_id = NEW.saved_deck_id) >= 50;
END;
CREATE TRIGGER deck_version_quota BEFORE INSERT ON deck_versions
BEGIN
  SELECT RAISE(ABORT, 'deck_version_limit_reached') WHERE (SELECT COUNT(*) FROM deck_versions WHERE deck_id = NEW.deck_id) >= 200;
END;
