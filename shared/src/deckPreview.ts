import type { Card } from "./api-types";
import type { OmnidexDecklist, OmnidexDecklistCardLine } from "./omnidex-types";

/** A bounded sample of the published Main deck, not a recommended core or full list. */
export function deckPreviewCards(deck: OmnidexDecklist): OmnidexDecklistCardLine[] {
  const quantities = new Map<string, number>();
  for (const line of deck.main) {
    if (line.quantity > 0) quantities.set(line.card, (quantities.get(line.card) ?? 0) + line.quantity);
  }
  return [...quantities].map(([card, quantity]) => ({ card, quantity }))
    .sort((a, b) => b.quantity - a.quantity || a.card.localeCompare(b.card)).slice(0, 3);
}

/** Display order only: Normal first, other elements alphabetically, unresolved cards last.
 * Keep the source list and its quantities intact for exports, identity and saved snapshots. */
export function sortDeckCardsByElement<T extends { name: string } | { card: string }>(
  lines: readonly T[],
  cardsByName: ReadonlyMap<string, Pick<Card, "element">>,
): T[] {
  const name = (line: T) => "card" in line ? line.card : line.name;
  const element = (line: T) => cardsByName.get(name(line))?.element?.trim().toUpperCase() || null;
  const rank = (value: string | null) => value === "NORM" ? 0 : value === null ? 2 : 1;
  return [...lines].sort((a, b) => {
    const ae = element(a), be = element(b);
    return rank(ae) - rank(be)
      || (ae ?? "").localeCompare(be ?? "", "en")
      || name(a).localeCompare(name(b), "en", { sensitivity: "base" });
  });
}
