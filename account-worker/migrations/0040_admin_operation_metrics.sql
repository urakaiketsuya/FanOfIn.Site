-- Aggregate operational counters only: no account IDs, URLs, or request bodies.
CREATE TABLE admin_metric_coverage (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  started_at TEXT NOT NULL
);
INSERT INTO admin_metric_coverage VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE admin_operation_metrics (
  day TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('deck-save','deck-import','collection','combo','match-log','analysis','trade')),
  requests INTEGER NOT NULL DEFAULT 0 CHECK(requests >= 0),
  rejected INTEGER NOT NULL DEFAULT 0 CHECK(rejected >= 0),
  errors INTEGER NOT NULL DEFAULT 0 CHECK(errors >= 0),
  PRIMARY KEY(day, operation)
);
