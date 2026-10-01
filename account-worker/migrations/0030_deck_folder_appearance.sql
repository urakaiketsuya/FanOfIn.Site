ALTER TABLE deck_folders ADD COLUMN cover_card_name TEXT;
ALTER TABLE deck_folders ADD COLUMN accent TEXT NOT NULL DEFAULT 'blue'
  CHECK (accent IN ('blue', 'lavender', 'teal', 'rosewater'));
