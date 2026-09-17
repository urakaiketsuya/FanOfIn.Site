import type { Card, CardImpactEntry, CardQuantityBucket } from "@gatcg/shared";
import { legalMaxCopies, pickBetterQuantityScoped } from "../../../lib/cardQuantityAdvice";
import type { DeckBuilderRow } from "../useDeckBuilderPopulation";
import type { SuggestedCard } from "./buildTournamentSuggestedDeck";

export type DeckSection = "main" | "material" | "sideboard";

export function pluralitySection(rows: DeckBuilderRow[], cardName: string): DeckSection {
  let mainCount = 0;
  let materialCount = 0;
  let sideboardCount = 0;
  for (const row of rows) {
    if (row.main.has(cardName)) mainCount++;
    if (row.material.has(cardName)) materialCount++;
    if (row.sideboard.has(cardName)) sideboardCount++;
  }
  if (materialCount > 0 && materialCount >= mainCount && materialCount >= sideboardCount) return "material";
  if (sideboardCount > 0 && sideboardCount >= mainCount) return "sideboard";
  return "main";
}

export function modalQuantity(rows: DeckBuilderRow[], section: DeckSection, cardName: string, card: Card | undefined): number {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const quantity = row[section].get(cardName);
    if (quantity !== undefined) counts.set(quantity, (counts.get(quantity) ?? 0) + 1);
  }
  if (counts.size === 0) return legalMaxCopies(card);
  const [best] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return Math.min(best, legalMaxCopies(card));
}

export function toSuggested(
  cardName: string,
  quantity: number,
  locked: boolean,
  entry: CardImpactEntry | undefined,
  reason: SuggestedCard["reason"],
  section: DeckSection,
  optimizedFrom: number | null = null,
  quantityEvidence: SuggestedCard["quantityEvidence"] = { source: "matching population", sampleSize: 0 },
): SuggestedCard {
  return {
    cardName,
    quantity,
    locked,
    section,
    adjustedLift: entry?.adjustedLift ?? null,
    sample: entry ? { with: entry.deckCountWith, without: entry.deckCountWithout } : null,
    reason,
    optimizedFrom,
    quantityEvidence,
  };
}

export function pickQuantity(
  rows: DeckBuilderRow[],
  section: DeckSection,
  cardName: string,
  card: Card | undefined,
  quantityBucketsByName: Map<string, CardQuantityBucket[]>,
  localQuantityBuckets: Map<string, CardQuantityBucket[]>,
): { quantity: number; optimizedFrom: number | null; evidence: SuggestedCard["quantityEvidence"] } {
  const modal = modalQuantity(rows, section, cardName, card);
  const localSample = rows.filter((row) => row[section].has(cardName)).length;
  const advice = pickBetterQuantityScoped(modal, localQuantityBuckets.get(cardName), quantityBucketsByName.get(cardName), legalMaxCopies(card));
  if (!advice) return { quantity: modal, optimizedFrom: null, evidence: { source: "matching population", sampleSize: localSample } };
  const source = advice.scope === "local" ? "narrowed population" : "global";
  return { quantity: advice.quantity, optimizedFrom: advice.optimizedFrom, evidence: { source, sampleSize: advice.sampleSize } };
}
