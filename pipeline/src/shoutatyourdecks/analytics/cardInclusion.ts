import type { CardInclusionData, CardInclusionEntry, DeckLine, ShoutAtYourDecksDeck } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../../cards/catalog.js";
import { config } from "../../config.js";

/** Deck identity is main+material, sideboard excluded — same convention as everywhere else in this app (see docs/CALCULATIONS.md, "The deck identity convention"). */
function identityLines(deck: ShoutAtYourDecksDeck): DeckLine[] {
  return [...deck.materialDeck, ...deck.mainDeck];
}

function tally(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): CardInclusionEntry[] {
  const deckCounts = new Map<string, number>();
  const copyCounts = new Map<string, number>();
  const resolvedFlag = new Map<string, boolean>();

  for (const deck of decks) {
    const seenThisDeck = new Set<string>();
    for (const line of identityLines(deck)) {
      const card = resolveCard(cardIndex, line.name);
      const key = card?.name ?? line.name;
      if (!resolvedFlag.has(key)) resolvedFlag.set(key, Boolean(card));
      copyCounts.set(key, (copyCounts.get(key) ?? 0) + line.quantity);
      if (!seenThisDeck.has(key)) {
        seenThisDeck.add(key);
        deckCounts.set(key, (deckCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const totalDecks = decks.length;
  return Array.from(deckCounts.entries())
    .map(([name, deckCount]) => ({
      name,
      resolved: resolvedFlag.get(name) ?? false,
      deckCount,
      percentOfDecks: totalDecks > 0 ? deckCount / totalDecks : 0,
      totalCopies: copyCounts.get(name) ?? 0,
      avgCopiesWhenIncluded: (copyCounts.get(name) ?? 0) / deckCount,
    }))
    .sort((a, b) => b.deckCount - a.deckCount);
}

export function computeCardInclusion(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): CardInclusionData {
  const byChampion: Record<string, { deckCount: number; cards: CardInclusionEntry[] }> = {};
  const decksByChampion = new Map<string, ShoutAtYourDecksDeck[]>();
  for (const deck of decks) {
    const champion = deck.champion ?? "unknown";
    const list = decksByChampion.get(champion);
    if (list) list.push(deck);
    else decksByChampion.set(champion, [deck]);
  }

  for (const [champion, championDecks] of decksByChampion) {
    if (championDecks.length < config.sydMinChampionSampleSize) continue;
    byChampion[champion] = { deckCount: championDecks.length, cards: tally(championDecks, cardIndex) };
  }

  return {
    generatedAt: new Date().toISOString(),
    decksConsidered: decks.length,
    overall: tally(decks, cardIndex),
    byChampion,
  };
}
