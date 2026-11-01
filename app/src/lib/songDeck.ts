import type { Card } from "@gatcg/shared";

/** A deck with level 1 Casella in Material unlocks the Song deck: an unordered private deck of at most four different Song cards. */
export const SONG_DECK_CHAMPION = "Casella";
export const SONG_DECK_MAX_DIFFERENT_CARDS = 4;

/** Song cards are Unlockable Actions, so they can only be registered in the Song deck. The catalog may mark them by type or by subtype. */
export function isSongCard(card: Pick<Card, "types" | "subtypes"> | undefined): boolean {
  return Boolean(card && (card.types.includes("UNLOCKABLE") || card.subtypes?.includes("SONG")));
}

export function unlocksSongDeck(card: Pick<Card, "name" | "types" | "level"> | undefined): boolean {
  return Boolean(card?.types.includes("CHAMPION") && card.level === 1 && card.name.split(",")[0].trim() === SONG_DECK_CHAMPION);
}
