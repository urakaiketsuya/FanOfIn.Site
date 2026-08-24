import type { DeckEraBucket, DeckEraData, DeckLine, ShoutAtYourDecksDeck } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../../cards/catalog.js";

/**
 * ShoutAtYourDecks never captured a real deck creation/update date (see docs/CALCULATIONS.md) —
 * this infers a lower bound instead: a deck can't be older than the newest card it requires. For
 * each card, its *earliest* printing's release date is "when this card first became legal" (a
 * card reprinted later doesn't get any older for this purpose — first printing is what matters).
 * A deck's inferred date is the MAX of that across every card in it — i.e. the deck is at least as
 * new as whichever single card in it was introduced most recently. This is a floor, not the real
 * date: a deck built yesterday using only year-old cards infers as year-old. Decks are grouped by
 * the set that produced this bounding card, which stands in for a "season" grouping in the absence
 * of any real date field.
 */
function earliestReleaseDate(card: CardSignature): { date: string; setPrefix: string } | null {
  let best: { date: string; setPrefix: string } | null = null;
  for (const edition of card.editions) {
    if (!edition.releaseDate) continue;
    if (!best || edition.releaseDate < best.date) best = { date: edition.releaseDate, setPrefix: edition.setPrefix };
  }
  return best;
}

function deckInferredEra(lines: DeckLine[], cardIndex: Map<string, CardSignature>): { date: string; setPrefix: string } | null {
  let latest: { date: string; setPrefix: string } | null = null;
  for (const line of lines) {
    const card = resolveCard(cardIndex, line.name);
    if (!card) continue;
    const earliest = earliestReleaseDate(card);
    if (!earliest) continue;
    if (!latest || earliest.date > latest.date) latest = earliest;
  }
  return latest;
}

export function computeDeckEra(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): DeckEraData {
  const bySet = new Map<string, { earliestDate: string; deckCount: number }>();
  let unresolvedDeckCount = 0;

  for (const deck of decks) {
    const era = deckInferredEra([...deck.materialDeck, ...deck.mainDeck], cardIndex);
    if (!era) {
      unresolvedDeckCount++;
      continue;
    }
    const existing = bySet.get(era.setPrefix);
    if (existing) {
      existing.deckCount++;
      if (era.date < existing.earliestDate) existing.earliestDate = era.date;
    } else {
      bySet.set(era.setPrefix, { earliestDate: era.date, deckCount: 1 });
    }
  }

  const resolvedCount = decks.length - unresolvedDeckCount;
  const buckets: DeckEraBucket[] = Array.from(bySet.entries())
    .map(([setPrefix, { earliestDate, deckCount }]) => ({
      setPrefix,
      earliestDate,
      deckCount,
      percentOfDecks: resolvedCount > 0 ? deckCount / resolvedCount : 0,
    }))
    .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));

  return { generatedAt: new Date().toISOString(), decksConsidered: decks.length, unresolvedDeckCount, buckets };
}
