import type { Card, SavedCardPackage } from "@gatcg/shared";

/** Match the Standard legality convention used by historical archetypes. */
export function packageBannedCards(
  pkg: Pick<SavedCardPackage, "cards">,
  cardsByName: ReadonlyMap<string, Pick<Card, "legality">>,
): string[] {
  return pkg.cards.filter((name) => cardsByName.get(name)?.legality?.STANDARD?.limit === 0);
}
