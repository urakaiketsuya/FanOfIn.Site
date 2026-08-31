ALTER TABLE users ADD COLUMN deck_checklist_dismissed INTEGER NOT NULL DEFAULT 0
  CHECK (deck_checklist_dismissed IN (0, 1));
ALTER TABLE users ADD COLUMN display_name_reviewed INTEGER NOT NULL DEFAULT 0
  CHECK (display_name_reviewed IN (0, 1));

ALTER TABLE user_decks ADD COLUMN primer_markdown TEXT NOT NULL DEFAULT '';
ALTER TABLE user_decks ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE user_decks ADD COLUMN published_title TEXT;
ALTER TABLE user_decks ADD COLUMN published_description TEXT;
ALTER TABLE user_decks ADD COLUMN published_primer_markdown TEXT;
ALTER TABLE user_decks ADD COLUMN published_tags_json TEXT;

-- Freeze the metadata that existing public links showed immediately before this migration.
UPDATE user_decks
SET published_title = title,
    published_description = description,
    published_primer_markdown = primer_markdown,
    published_tags_json = tags_json
WHERE published_version_id IS NOT NULL;
