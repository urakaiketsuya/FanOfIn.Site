ALTER TABLE game_players ADD COLUMN champion_name TEXT NOT NULL DEFAULT '';

-- Backfill the matches received before Clarent began sending the display name.
UPDATE game_players SET champion_name = 'Diao Chan, Enchantress' WHERE champion_id = '00xbh8oc00';
UPDATE game_players SET champion_name = 'Fragmented Spirit of Wind' WHERE champion_id = '1trn0yetae';
