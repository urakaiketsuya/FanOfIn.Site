-- Public/unlisted decks no longer freeze at whatever was current when Publish was last clicked
-- (see decks.ts's createDeckVersion/updateDeckMetadata/renameDeck) — their published snapshot now
-- tracks the current version and draft metadata automatically. Backfill existing public/unlisted
-- decks so their already-published links reflect the latest saved edit immediately, instead of
-- only catching up the next time each deck is individually edited.
UPDATE user_decks
SET published_version_id = current_version_id,
    published_title = title,
    published_description = description,
    published_primer_markdown = primer_markdown,
    published_tags_json = tags_json
WHERE visibility <> 'private'
  AND current_version_id IS NOT NULL
  AND published_version_id IS NOT current_version_id;
