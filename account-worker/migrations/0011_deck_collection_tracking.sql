-- Personal flag: this deck currently holds physical cards from the owner's collection, so its
-- requirements get pooled with other tracked decks when checking for cards shared across decks.
ALTER TABLE user_decks ADD COLUMN collection_tracked INTEGER NOT NULL DEFAULT 0;
