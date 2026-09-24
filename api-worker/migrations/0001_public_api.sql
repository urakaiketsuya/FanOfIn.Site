-- Payloads are content addressed: unchanged resources are never rewritten.
CREATE TABLE api_payloads (
  hash TEXT PRIMARY KEY,
  body TEXT NOT NULL CHECK(json_valid(body))
);
CREATE TABLE api_snapshots (
  version TEXT PRIMARY KEY,
  metadata TEXT NOT NULL CHECK(json_valid(metadata))
);
CREATE TABLE api_entries (
  version TEXT NOT NULL REFERENCES api_snapshots(version),
  kind TEXT NOT NULL CHECK(kind IN ('cards', 'archetypes')),
  id TEXT NOT NULL,
  hash TEXT NOT NULL REFERENCES api_payloads(hash),
  PRIMARY KEY(version, kind, id)
) WITHOUT ROWID;
CREATE INDEX api_entries_hash ON api_entries(hash);
CREATE TABLE api_active (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  version TEXT NOT NULL REFERENCES api_snapshots(version)
);
