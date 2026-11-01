import type { Card } from "@gatcg/shared";
import { isSongCard } from "./songDeck";

export type EditableDeckDestination = "main" | "material" | "sideboard" | "maybeboard" | "song";

export interface DeckDestinationEligibility {
  allowed: boolean;
  reason?: string;
}

/**
 * Static card-type routing shared by saved-deck move controls. Sideboards can contain both
 * Main- and Material-deck card types (their point cost is validated at deck level), while the
 * Maybeboard is intentionally unrestricted. Song cards are Unlockable Actions: they belong only
 * in the Song deck (or the Maybeboard), and the Song deck takes only Song cards. Unknown catalog
 * cards remain movable so an import with incomplete catalog data is not trapped in its current section.
 */
export function deckDestinationEligibility(card: Pick<Card, "types" | "subtypes"> | undefined, destination: EditableDeckDestination): DeckDestinationEligibility {
  if (!card || destination === "maybeboard") return { allowed: true };
  const song = isSongCard(card);
  if (destination === "song") return song ? { allowed: true } : { allowed: false, reason: "Only Song cards belong in the Song Deck." };
  if (song) return { allowed: false, reason: "Song cards can only be registered in the Song Deck." };
  if (destination === "sideboard") return { allowed: true };
  const materialOnly = card.types.includes("CHAMPION") || card.types.includes("REGALIA");
  if (destination === "main" && materialOnly) {
    return { allowed: false, reason: "Champion and Regalia cards belong in the Material Deck." };
  }
  if (destination === "material" && !materialOnly) {
    return { allowed: false, reason: "Only Champion and Regalia cards belong in the Material Deck." };
  }
  return { allowed: true };
}
