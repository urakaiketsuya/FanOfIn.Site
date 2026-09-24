PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN community_role TEXT NOT NULL DEFAULT 'member'
  CHECK (community_role IN ('member', 'moderator', 'staff'));

CREATE TABLE user_blocks (
  blocker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id != blocked_user_id)
);

CREATE TABLE deck_comment_threads (
  target_kind TEXT NOT NULL CHECK (target_kind IN ('community', 'tournament')),
  target_id TEXT NOT NULL,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (target_kind, target_id)
);

CREATE TABLE deck_comments (
  id TEXT PRIMARY KEY,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES deck_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'hidden')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (target_kind, target_id) REFERENCES deck_comment_threads(target_kind, target_id) ON DELETE CASCADE
);
CREATE INDEX idx_deck_comments_thread_created ON deck_comments(target_kind, target_id, created_at);

CREATE TABLE comment_edits (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES deck_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE comment_reports (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES deck_comments(id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'abuse', 'harassment', 'other')),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(comment_id, reporter_user_id)
);

CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE binder_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  trade_method TEXT NOT NULL DEFAULT 'either' CHECK (trade_method IN ('local', 'shipping', 'either')),
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE binder_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('available', 'wanted')),
  card_uuid TEXT NOT NULL,
  card_name TEXT NOT NULL,
  edition_uuid TEXT,
  set_prefix TEXT,
  collector_number TEXT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  condition TEXT NOT NULL DEFAULT 'Any',
  language TEXT NOT NULL DEFAULT 'Any',
  accepts_alternatives INTEGER NOT NULL DEFAULT 1 CHECK (accepts_alternatives IN (0, 1)),
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_binder_items_user_kind ON binder_items(user_id, kind, card_name COLLATE NOCASE);
CREATE INDEX idx_binder_items_match ON binder_items(kind, card_uuid, edition_uuid);

CREATE TABLE trades (
  id TEXT PRIMARY KEY,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'countered', 'accepted', 'sender_sent', 'recipient_sent', 'both_sent', 'completed', 'declined', 'cancelled', 'disputed')),
  current_revision INTEGER NOT NULL DEFAULT 1,
  sender_received INTEGER NOT NULL DEFAULT 0 CHECK (sender_received IN (0, 1)),
  recipient_received INTEGER NOT NULL DEFAULT 0 CHECK (recipient_received IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (sender_user_id != recipient_user_id)
);
CREATE INDEX idx_trades_participants ON trades(sender_user_id, recipient_user_id, updated_at DESC);

CREATE TABLE trade_revisions (
  trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  proposer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  lines_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (trade_id, revision_number)
);

CREATE TABLE trade_events (
  id TEXT PRIMARY KEY,
  trade_id TEXT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_trade_events_trade_created ON trade_events(trade_id, created_at);
