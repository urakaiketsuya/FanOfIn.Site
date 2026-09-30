CREATE TABLE card_tag_proposals (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  review_token TEXT
);
CREATE INDEX card_tag_proposals_owner ON card_tag_proposals(user_id, created_at DESC, id);
CREATE INDEX card_tag_proposals_queue ON card_tag_proposals(status, created_at, id);
CREATE TABLE card_tag_overrides (
  card_uuid TEXT NOT NULL,
  edition_uuid TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('add','remove')),
  proposal_id TEXT NOT NULL REFERENCES card_tag_proposals(id),
  PRIMARY KEY(card_uuid, edition_uuid, tag)
);
