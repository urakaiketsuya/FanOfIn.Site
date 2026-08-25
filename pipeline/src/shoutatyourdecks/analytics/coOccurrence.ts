import type { CommunityCoOccurrenceData, CommunityCoOccurrenceEntry, DeckLine, ShoutAtYourDecksDeck } from "@gatcg/shared";
import { resolveCard, type CardSignature } from "../../cards/catalog.js";
import { config } from "../../config.js";

/** Same "too few co-occurring decks to trust" bar as the client-side lens this mirrors (useBuddyCards.ts's MIN_SUPPORT). */
const MIN_SUPPORT = 5;
const MAX_BUDDIES_PER_CARD = 5;

/** Deck identity is main+material, sideboard excluded — same convention as cardInclusion.ts and everywhere else in this app. */
function identityLines(deck: ShoutAtYourDecksDeck): DeckLine[] {
  return [...deck.materialDeck, ...deck.mainDeck];
}

/**
 * For one champion's decks, every card's top co-occurring other cards — pure presence-based
 * co-occurrence, deliberately unranked by anything else (there's no win-rate data to rank by; see
 * useBuddyCards.ts's own doc comment for why "played together often" is already a real signal on
 * its own). A deck's own card names are resolved+deduped first (`resolveCard`, matching
 * cardInclusion.ts), so a mis-cased/curly-quote submission doesn't fragment a real pairing.
 */
function tallyCoOccurrence(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): Record<string, CommunityCoOccurrenceEntry[]> {
  const pairCounts = new Map<string, Map<string, number>>();
  const deckCountByCard = new Map<string, number>();

  for (const deck of decks) {
    const names = new Set<string>();
    for (const line of identityLines(deck)) {
      names.add(resolveCard(cardIndex, line.name)?.name ?? line.name);
    }
    const nameList = Array.from(names);
    for (const name of nameList) deckCountByCard.set(name, (deckCountByCard.get(name) ?? 0) + 1);

    for (let i = 0; i < nameList.length; i++) {
      for (let j = i + 1; j < nameList.length; j++) {
        const [a, b] = nameList[i] <= nameList[j] ? [nameList[i], nameList[j]] : [nameList[j], nameList[i]];
        const inner = pairCounts.get(a) ?? new Map<string, number>();
        inner.set(b, (inner.get(b) ?? 0) + 1);
        pairCounts.set(a, inner);
      }
    }
  }

  // Fold the (a,b)-keyed-once pair counts back out into a per-card top-N buddy list, in both directions.
  const buddiesByCard = new Map<string, Map<string, number>>();
  const addCount = (from: string, to: string, count: number) => {
    const inner = buddiesByCard.get(from) ?? new Map<string, number>();
    inner.set(to, count);
    buddiesByCard.set(from, inner);
  };
  for (const [a, inner] of pairCounts) {
    for (const [b, count] of inner) {
      addCount(a, b, count);
      addCount(b, a, count);
    }
  }

  const result: Record<string, CommunityCoOccurrenceEntry[]> = {};
  for (const [cardName, buddyCounts] of buddiesByCard) {
    const deckCount = deckCountByCard.get(cardName) ?? 0;
    if (deckCount === 0) continue;
    const buddies = Array.from(buddyCounts.entries())
      .filter(([, count]) => count >= MIN_SUPPORT)
      .map(([buddyName, count]) => ({ cardName: buddyName, count, coOccurrenceRate: count / deckCount }))
      .sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate)
      .slice(0, MAX_BUDDIES_PER_CARD);
    if (buddies.length > 0) result[cardName] = buddies;
  }
  return result;
}

export function computeCoOccurrence(decks: ShoutAtYourDecksDeck[], cardIndex: Map<string, CardSignature>): CommunityCoOccurrenceData {
  const decksByChampion = new Map<string, ShoutAtYourDecksDeck[]>();
  for (const deck of decks) {
    const champion = deck.champion ?? "unknown";
    const list = decksByChampion.get(champion);
    if (list) list.push(deck);
    else decksByChampion.set(champion, [deck]);
  }

  const byChampion: Record<string, Record<string, CommunityCoOccurrenceEntry[]>> = {};
  for (const [champion, championDecks] of decksByChampion) {
    if (championDecks.length < config.sydMinChampionSampleSize) continue;
    byChampion[champion] = tallyCoOccurrence(championDecks, cardIndex);
  }

  return { generatedAt: new Date().toISOString(), decksConsidered: decks.length, byChampion };
}
