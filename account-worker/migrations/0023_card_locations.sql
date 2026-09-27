-- Locations pool physical printings. Existing loan notes are retained for reconciliation.
ALTER TABLE collection_card_tracking ADD COLUMN assignments_json TEXT NOT NULL DEFAULT '[]';
