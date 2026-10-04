-- Presentation belongs to each owner's version, never a shared canonical build.
ALTER TABLE deck_versions ADD COLUMN printings_json TEXT NOT NULL DEFAULT '{}';
