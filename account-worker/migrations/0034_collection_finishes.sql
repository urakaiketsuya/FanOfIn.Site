-- Finish is independent of printing. Preserve every legacy pool as unspecified.
DROP TRIGGER trade_accept_capacity;
DROP TRIGGER tracking_trade_capacity_insert;
DROP TRIGGER tracking_trade_capacity_update;
DROP TRIGGER reserved_binder_identity;
DROP TRIGGER collection_entries_trade_capacity_update;
DROP TRIGGER collection_entries_trade_capacity_delete;
DROP TRIGGER collection_printing_entries_trade_capacity_update;
DROP TRIGGER collection_printing_entries_trade_capacity_delete;
DROP TRIGGER reserved_binder_quantity;
DROP TRIGGER reserved_binder_delete;
DROP TRIGGER collection_update_snapshot;
DROP VIEW trade_capacity_conflicts;
DROP VIEW trade_card_reservations;
CREATE TABLE collection_entries_finish (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0 AND owned_quantity <= 9999),
  proxy_quantity INTEGER NOT NULL DEFAULT 0 CHECK (proxy_quantity >= 0 AND proxy_quantity <= 9999),
  updated_at TEXT NOT NULL,
  finish TEXT NOT NULL DEFAULT 'unspecified' CHECK (finish IN ('unspecified','nonfoil','foil')),
  PRIMARY KEY (user_id, card_uuid, finish)
);
INSERT INTO collection_entries_finish SELECT *, 'unspecified' FROM collection_entries;
DROP TABLE collection_entries;
ALTER TABLE collection_entries_finish RENAME TO collection_entries;
CREATE TABLE collection_printing_entries_finish (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  edition_uuid TEXT NOT NULL,
  set_prefix TEXT,
  collector_number TEXT,
  owned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (owned_quantity >= 0 AND owned_quantity <= 9999),
  proxy_quantity INTEGER NOT NULL DEFAULT 0 CHECK (proxy_quantity >= 0 AND proxy_quantity <= 9999),
  updated_at TEXT NOT NULL,
  finish TEXT NOT NULL DEFAULT 'unspecified' CHECK (finish IN ('unspecified','nonfoil','foil')),
  PRIMARY KEY (user_id, edition_uuid, finish)
);
INSERT INTO collection_printing_entries_finish SELECT *, 'unspecified' FROM collection_printing_entries;
DROP TABLE collection_printing_entries;
ALTER TABLE collection_printing_entries_finish RENAME TO collection_printing_entries;
CREATE INDEX idx_collection_entries_user_name ON collection_entries(user_id,card_name COLLATE NOCASE);
CREATE INDEX idx_collection_printings_user_card ON collection_printing_entries(user_id,card_uuid);
CREATE INDEX idx_collection_printings_user_name ON collection_printing_entries(user_id,card_name COLLATE NOCASE);
ALTER TABLE binder_items ADD COLUMN finish TEXT NOT NULL DEFAULT 'unspecified' CHECK (finish IN ('unspecified','nonfoil','foil'));
-- Reservation identity comes from the accepted revision, never a mutable binder row.
CREATE VIEW trade_card_reservations AS
SELECT CASE json_extract(l.value,'$.direction') WHEN 'sender_gives' THEN t.sender_user_id ELSE t.recipient_user_id END AS user_id,
 json_extract(l.value,'$.cardUuid') AS card_uuid,
 json_extract(l.value,'$.editionUuid') AS edition_uuid,
 COALESCE(json_extract(l.value,'$.finish'),'unspecified') AS finish,
 json_extract(l.value,'$.binderItemId') AS binder_item_id,
 SUM(json_extract(l.value,'$.quantity')) AS quantity
FROM trades t JOIN trade_revisions r ON r.trade_id=t.id AND r.revision_number=t.current_revision, json_each(r.lines_json) l
WHERE t.status IN ('accepted','sender_sent','recipient_sent','both_sent','disputed')
GROUP BY user_id,card_uuid,edition_uuid,finish,binder_item_id;

CREATE VIEW trade_capacity_conflicts AS
SELECT r.user_id,r.card_uuid FROM trade_card_reservations r
GROUP BY r.user_id,r.card_uuid
HAVING SUM(r.quantity) + COALESCE((SELECT SUM(json_extract(a.value,'$.quantity')) FROM collection_card_tracking c,json_each(c.assignments_json) a WHERE c.user_id=r.user_id AND c.card_uuid=r.card_uuid),0)
 + COALESCE((SELECT SUM(json_extract(l.value,'$.quantity')) FROM collection_card_tracking c,json_each(c.loans_json) l WHERE c.user_id=r.user_id AND c.card_uuid=r.card_uuid AND json_extract(l.value,'$.returnedAt') IS NULL),0)
 > COALESCE((SELECT SUM(owned_quantity) FROM collection_entries e WHERE e.user_id=r.user_id AND e.card_uuid=r.card_uuid),0)
 + COALESCE((SELECT SUM(owned_quantity) FROM collection_printing_entries e WHERE e.user_id=r.user_id AND e.card_uuid=r.card_uuid),0)
UNION
SELECT r.user_id,r.card_uuid FROM trade_card_reservations r GROUP BY r.user_id,r.card_uuid,r.edition_uuid,r.finish
HAVING SUM(r.quantity) > CASE WHEN r.edition_uuid IS NULL THEN COALESCE((SELECT SUM(owned_quantity) FROM collection_entries e WHERE e.user_id=r.user_id AND e.card_uuid=r.card_uuid AND e.finish=r.finish),0)
 ELSE COALESCE((SELECT owned_quantity FROM collection_printing_entries e WHERE e.user_id=r.user_id AND e.card_uuid=r.card_uuid AND e.edition_uuid=r.edition_uuid AND e.finish=r.finish),0) END;

CREATE TRIGGER trade_accept_capacity AFTER UPDATE OF status ON trades WHEN NEW.status='accepted'
BEGIN
 SELECT RAISE(ABORT,'An offered binder item changed. Reload the offer.') WHERE EXISTS (
  SELECT 1 FROM trade_card_reservations r LEFT JOIN binder_items b ON b.id=r.binder_item_id
  WHERE r.user_id IN (NEW.sender_user_id,NEW.recipient_user_id) AND (b.id IS NULL OR b.kind!='available' OR b.user_id!=r.user_id OR b.card_uuid!=r.card_uuid OR b.edition_uuid IS NOT r.edition_uuid OR b.finish!=r.finish)
 ) OR EXISTS (SELECT 1 FROM trade_card_reservations r JOIN binder_items b ON b.id=r.binder_item_id WHERE r.user_id IN (NEW.sender_user_id,NEW.recipient_user_id) GROUP BY r.binder_item_id HAVING SUM(r.quantity)>b.quantity);
 SELECT RAISE(ABORT,'Cards are assigned, lent, or reserved by another trade. Reload availability.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id IN (NEW.sender_user_id,NEW.recipient_user_id));
END;
CREATE TRIGGER tracking_trade_capacity_insert AFTER INSERT ON collection_card_tracking
BEGIN
 SELECT RAISE(ABORT,'Accepted trades reserve these copies. Reduce the loan or deck assignment.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id=NEW.user_id AND card_uuid=NEW.card_uuid);
END;
CREATE TRIGGER tracking_trade_capacity_update AFTER UPDATE ON collection_card_tracking
BEGIN
 SELECT RAISE(ABORT,'Accepted trades reserve these copies. Reduce the loan or deck assignment.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id=NEW.user_id AND card_uuid=NEW.card_uuid)
 AND (SELECT COALESCE(SUM(json_extract(value,'$.quantity')),0) FROM json_each(NEW.assignments_json)) + (SELECT COALESCE(SUM(json_extract(value,'$.quantity')),0) FROM json_each(NEW.loans_json) WHERE json_extract(value,'$.returnedAt') IS NULL)
 > (SELECT COALESCE(SUM(json_extract(value,'$.quantity')),0) FROM json_each(OLD.assignments_json)) + (SELECT COALESCE(SUM(json_extract(value,'$.quantity')),0) FROM json_each(OLD.loans_json) WHERE json_extract(value,'$.returnedAt') IS NULL);
END;
CREATE TRIGGER reserved_binder_identity BEFORE UPDATE ON binder_items
WHEN EXISTS(SELECT 1 FROM trade_card_reservations WHERE binder_item_id=OLD.id)
BEGIN
 SELECT RAISE(ABORT,'Reserved binder items cannot change card, printing, finish, or list.') WHERE NEW.card_uuid!=OLD.card_uuid OR NEW.edition_uuid IS NOT OLD.edition_uuid OR NEW.kind!=OLD.kind OR NEW.finish!=OLD.finish;
END;

CREATE TRIGGER collection_entries_trade_capacity_update AFTER UPDATE ON collection_entries
BEGIN
 SELECT RAISE(ABORT,'Accepted trades reserve these copies. Reconcile the trade before reducing ownership.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id=NEW.user_id AND card_uuid=NEW.card_uuid);
END;

CREATE TRIGGER collection_entries_trade_capacity_delete AFTER DELETE ON collection_entries
BEGIN
 SELECT RAISE(ABORT,'Accepted trades reserve these copies. Reconcile the trade before reducing ownership.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id=OLD.user_id AND card_uuid=OLD.card_uuid);
END;

CREATE TRIGGER collection_printing_entries_trade_capacity_update AFTER UPDATE ON collection_printing_entries
BEGIN
 SELECT RAISE(ABORT,'Accepted trades reserve these copies. Reconcile the trade before reducing ownership.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id=NEW.user_id AND card_uuid=NEW.card_uuid);
END;

CREATE TRIGGER collection_printing_entries_trade_capacity_delete AFTER DELETE ON collection_printing_entries
BEGIN
 SELECT RAISE(ABORT,'Accepted trades reserve these copies. Reconcile the trade before reducing ownership.') WHERE EXISTS(SELECT 1 FROM trade_capacity_conflicts WHERE user_id=OLD.user_id AND card_uuid=OLD.card_uuid);
END;
CREATE TRIGGER reserved_binder_quantity BEFORE UPDATE ON binder_items
BEGIN
 SELECT RAISE(ABORT,'An accepted trade reserves this quantity.') WHERE NEW.quantity < COALESCE((SELECT SUM(quantity) FROM trade_card_reservations WHERE binder_item_id=OLD.id),0);
END;
CREATE TRIGGER reserved_binder_delete BEFORE DELETE ON binder_items
BEGIN
 SELECT RAISE(ABORT,'An accepted trade reserves this item.') WHERE EXISTS(SELECT 1 FROM trade_card_reservations WHERE binder_item_id=OLD.id);
END;

CREATE TRIGGER collection_update_snapshot BEFORE INSERT ON collection_update_receipts
BEGIN
  SELECT RAISE(ABORT, 'Collection changed while saving. Review and retry.') WHERE EXISTS (
    SELECT 1 FROM json_each(NEW.expected_json) c WHERE
      json_extract(c.value,'$.beforeOwned') != COALESCE(CASE WHEN json_extract(c.value,'$.editionUuid') IS NULL
        THEN (SELECT owned_quantity FROM collection_entries WHERE user_id=NEW.user_id AND card_uuid=json_extract(c.value,'$.cardUuid') AND finish=COALESCE(json_extract(c.value,'$.finish'),'unspecified'))
        ELSE (SELECT owned_quantity FROM collection_printing_entries WHERE user_id=NEW.user_id AND edition_uuid=json_extract(c.value,'$.editionUuid') AND finish=COALESCE(json_extract(c.value,'$.finish'),'unspecified')) END,0)
      OR json_extract(c.value,'$.beforeProxy') != COALESCE(CASE WHEN json_extract(c.value,'$.editionUuid') IS NULL
        THEN (SELECT proxy_quantity FROM collection_entries WHERE user_id=NEW.user_id AND card_uuid=json_extract(c.value,'$.cardUuid') AND finish=COALESCE(json_extract(c.value,'$.finish'),'unspecified'))
        ELSE (SELECT proxy_quantity FROM collection_printing_entries WHERE user_id=NEW.user_id AND edition_uuid=json_extract(c.value,'$.editionUuid') AND finish=COALESCE(json_extract(c.value,'$.finish'),'unspecified')) END,0)
  );
END;
