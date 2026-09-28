-- Durable acknowledgements make retries safe even when the response was lost.
CREATE TABLE collection_update_receipts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  changed INTEGER NOT NULL,
  expected_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, request_id)
);
-- Validate the read snapshot inside the write transaction before changing any copies.
CREATE TRIGGER collection_update_snapshot BEFORE INSERT ON collection_update_receipts
BEGIN
  SELECT RAISE(ABORT, 'Collection changed while saving. Review and retry.') WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.expected_json) c WHERE
      json_extract(c.value,'$.beforeOwned') != COALESCE(CASE WHEN json_extract(c.value,'$.editionUuid') IS NULL
        THEN (SELECT owned_quantity FROM collection_entries WHERE user_id=NEW.user_id AND card_uuid=json_extract(c.value,'$.cardUuid'))
        ELSE (SELECT owned_quantity FROM collection_printing_entries WHERE user_id=NEW.user_id AND edition_uuid=json_extract(c.value,'$.editionUuid')) END,0)
      OR json_extract(c.value,'$.beforeProxy') != COALESCE(CASE WHEN json_extract(c.value,'$.editionUuid') IS NULL
        THEN (SELECT proxy_quantity FROM collection_entries WHERE user_id=NEW.user_id AND card_uuid=json_extract(c.value,'$.cardUuid'))
        ELSE (SELECT proxy_quantity FROM collection_printing_entries WHERE user_id=NEW.user_id AND edition_uuid=json_extract(c.value,'$.editionUuid')) END,0)
  );
END;
