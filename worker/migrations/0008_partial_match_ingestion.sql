CREATE TABLE partial_match_submissions (
  source_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  source_match_id TEXT,
  received_at TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (source_id, submission_id),
  UNIQUE (source_id, source_match_id)
);

CREATE TRIGGER partial_match_submission_conflict
BEFORE INSERT ON partial_match_submissions
WHEN EXISTS (
  SELECT 1 FROM submitted_matches
  WHERE source_id = NEW.source_id
    AND (submission_id = NEW.submission_id OR source_match_id = NEW.source_match_id)
)
BEGIN
  SELECT RAISE(ABORT, 'Match submission already exists');
END;

CREATE TRIGGER complete_match_submission_conflict
BEFORE INSERT ON submitted_matches
WHEN EXISTS (
  SELECT 1 FROM partial_match_submissions
  WHERE source_id = NEW.source_id
    AND (submission_id = NEW.submission_id OR source_match_id = NEW.source_match_id)
)
BEGIN
  SELECT RAISE(ABORT, 'Match submission already exists');
END;
