CREATE TABLE catalog_snapshots (
 version TEXT PRIMARY KEY,
 metadata TEXT NOT NULL CHECK(json_valid(metadata)),
 created_at TEXT NOT NULL
);
CREATE TABLE catalog_chunks (
 version TEXT NOT NULL REFERENCES catalog_snapshots(version) ON DELETE CASCADE,
 position INTEGER NOT NULL,
 body TEXT NOT NULL,
 PRIMARY KEY(version,position)
);
CREATE TABLE catalog_active (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 version TEXT NOT NULL REFERENCES catalog_snapshots(version)
);
