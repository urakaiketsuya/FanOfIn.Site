-- Normalizes cardStats/turnStats/combatEvents (validated by the ingestion schema but, until now,
-- only ever persisted inside game_submissions.raw_payload_json — which is purged after
-- RAW_PAYLOAD_RETENTION_DAYS) into durable, queryable tables. See storage.ts's ingestSubmission.

-- One row per (submission, seat, card) actually present in cardStats. Note this table's presence
-- doesn't by itself prove deck-composition completeness: the ingestion schema allows an empty
-- cardStats object (see worker/test/fixtures/game-submission-v1.json's player 2), so a card with
-- zero rows here could mean "never drawn" or could mean "the sender didn't report it" — that's a
-- producer (TCGEngine) question, not something this table resolves on its own.
CREATE TABLE game_card_stats (
  submission_id TEXT NOT NULL REFERENCES game_submissions(submission_id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  card_id TEXT NOT NULL,
  drawn INTEGER NOT NULL,
  drawn_to_memory INTEGER NOT NULL,
  materialized INTEGER NOT NULL,
  reserved INTEGER NOT NULL,
  discarded INTEGER NOT NULL,
  activated INTEGER NOT NULL,
  PRIMARY KEY (submission_id, seat, card_id)
);

CREATE INDEX idx_game_card_stats_card_id ON game_card_stats(card_id);

-- turn_index is the entry's position within the submitted turnStats array, not the reported `turn`
-- number — the schema doesn't guarantee `turn` is unique or gapless per seat (it's a plain array,
-- not a map), so the position is the only value guaranteed unique and known at insert time.
CREATE TABLE game_turn_stats (
  submission_id TEXT NOT NULL REFERENCES game_submissions(submission_id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  turn_index INTEGER NOT NULL,
  turn INTEGER NOT NULL,
  cards_played INTEGER NOT NULL,
  memory_spent INTEGER NOT NULL,
  reserve_spent INTEGER NOT NULL,
  damage_dealt INTEGER NOT NULL,
  damage_taken INTEGER NOT NULL,
  healed INTEGER NOT NULL,
  level INTEGER NOT NULL,
  hp INTEGER NOT NULL,
  PRIMARY KEY (submission_id, seat, turn_index)
);

CREATE INDEX idx_game_turn_stats_turn ON game_turn_stats(turn);

-- event_index is the event's position in the submitted combatEvents array. source_seat/
-- source_card_id unify attack_initiated's attackerSeat/attackerCardId with damage_resolved's
-- sourceSeat/sourceCardId — both represent "the seat/card causing this event" — so a query for
-- "everything this card did" doesn't need to branch on event_type. Columns that only apply to one
-- event_type (weapon_card_id/cleave for attack_initiated; amount/is_combat/lethal/domain for
-- damage_resolved) are NULL on rows of the other type. Booleans stored as INTEGER (0/1), matching
-- SQLite/D1 convention — there is no native boolean column type.
CREATE TABLE game_combat_events (
  submission_id TEXT NOT NULL REFERENCES game_submissions(submission_id) ON DELETE CASCADE,
  event_index INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('attack_initiated', 'damage_resolved')),
  turn INTEGER NOT NULL,
  source_seat INTEGER NOT NULL,
  source_card_id TEXT NOT NULL,
  target_seat INTEGER NOT NULL,
  target_card_id TEXT NOT NULL,
  weapon_card_id TEXT,
  cleave INTEGER,
  amount INTEGER,
  is_combat INTEGER,
  lethal INTEGER,
  domain INTEGER,
  PRIMARY KEY (submission_id, event_index)
);

CREATE INDEX idx_game_combat_events_source_card ON game_combat_events(source_card_id);
CREATE INDEX idx_game_combat_events_target_card ON game_combat_events(target_card_id);
