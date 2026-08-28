-- Backfill more matches received before Clarent began sending the display name.
-- IDs resolved against TCGEngine's card database (GrandArchiveSim/GeneratedCode/cardArrayCache.json).
UPDATE game_players SET champion_name = 'Lorraine, Wandering Warrior' WHERE champion_id = 'DpHDGaX2Pn';
UPDATE game_players SET champion_name = 'Diana, Aether Dilettante' WHERE champion_id = 'm7f6r8f3y8';
UPDATE game_players SET champion_name = 'Spirit of Water' WHERE champion_id = 'tafqldAGRF';
UPDATE game_players SET champion_name = 'Sabrina, Spirit of Water' WHERE champion_id = 'tk3ir1o0qt';
