import type { Card } from "@gatcg/shared";

export type EditableDeckDestination = "main" | "material" | "sideboard" | "maybeboard";

export interface DeckDestinationEligibility {
  allowed: boolean;
  reason?: string;
}

/**
 * Static card-type routing shared by saved-deck move controls. Sideboards can contain both
 * Main- and Material-deck card types (their point cost is validated at deck level), while the
 * Maybeboard is intentionally unrestricted. Unknown catalog cards remain movable so an import
 * with incomplete catalog data is not trapped in its current section.
 */
export function deckDestinationEligibility(card: Pick<Card, "types"> | undefined, destination: EditableDeckDestination): DeckDestinationEligibility {
  if (!card || destination === "sideboard" || destination === "maybeboard") return { allowed: true };
  const materialOnly = card.types.includes("CHAMPION") || card.types.includes("REGALIA");
  if (destination === "main" && materialOnly) {
    return { allowed: false, reason: "Champion and Regalia cards belong in the Material Deck." };
  }
  if (destination === "material" && !materialOnly) {
    return { allowed: false, reason: "Only Champion and Regalia cards belong in the Material Deck." };
  }
  return { allowed: true };
}
