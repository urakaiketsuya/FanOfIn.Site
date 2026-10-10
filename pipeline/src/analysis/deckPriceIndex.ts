import type { DeckPriceIndexData, DeckSighting } from "@gatcg/shared";

export function buildDeckPriceIndex(
  sightings: Pick<DeckSighting, "deckId" | "price">[],
  generatedAt: string,
): DeckPriceIndexData {
  return { generatedAt, entries: sightings.map(({ deckId, price }) => [deckId, price]) };
}
