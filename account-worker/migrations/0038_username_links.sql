-- Reserve every historical address so renames cannot redirect another person's links.
CREATE TABLE profile_aliases (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX profile_aliases_user ON profile_aliases(user_id);
INSERT INTO profile_aliases(slug, user_id) SELECT profile_slug, id FROM users WHERE profile_slug IS NOT NULL;
CREATE TRIGGER reserve_profile_insert AFTER INSERT ON users WHEN NEW.profile_slug IS NOT NULL BEGIN
  INSERT INTO profile_aliases(slug, user_id) VALUES(NEW.profile_slug, NEW.id);
END;
CREATE TRIGGER guard_profile_rename BEFORE UPDATE OF profile_slug ON users
WHEN EXISTS(SELECT 1 FROM profile_aliases WHERE slug = NEW.profile_slug AND user_id != NEW.id)
BEGIN SELECT RAISE(ABORT, 'profile_address_taken'); END;
CREATE TRIGGER reserve_profile_rename AFTER UPDATE OF profile_slug ON users WHEN NEW.profile_slug IS NOT NULL BEGIN
  INSERT INTO profile_aliases(slug, user_id) VALUES(NEW.profile_slug, NEW.id) ON CONFLICT(slug) DO NOTHING;
END;
-- Keep URL characters predictable; duplicate names retain a stable disambiguator.
WITH RECURSIVE cleaned(id, old_slug, source, position, slug) AS (
  SELECT id, profile_slug, lower(display_name), 1, '' FROM users
  UNION ALL
  SELECT id, old_slug, source, position + 1, slug ||
    CASE WHEN substr(source, position, 1) GLOB '[a-z0-9_-]' THEN substr(source, position, 1)
         WHEN substr(source, position, 1) = ' ' THEN '-' ELSE '' END
  FROM cleaned WHERE position <= length(source) AND position <= 32
), bases AS (
  SELECT id, old_slug, CASE WHEN trim(slug, '-_') = '' THEN 'player' ELSE trim(slug, '-_') END AS base
  FROM cleaned WHERE position = min(length(source), 32) + 1
), names AS MATERIALIZED (
  SELECT id, CASE WHEN (SELECT count(*) FROM bases b WHERE b.base = bases.base) > 1
    OR EXISTS(SELECT 1 FROM profile_aliases WHERE slug = bases.base AND user_id != bases.id)
    THEN base || '-account-' || old_slug ELSE base END AS slug FROM bases
)
UPDATE users SET profile_slug = (SELECT slug FROM names WHERE names.id = users.id);
