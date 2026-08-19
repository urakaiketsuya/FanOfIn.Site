import { useMemo } from "react";
import type { DeckBuilderRow } from "./useDeckBuilderPopulation";

/** Below this many co-occurring decks, a "buddy" is more likely noise than a real pairing. */
const MIN_SUPPORT = 5;
const MAX_BUDDIES_PER_CARD = 5;

export interface BuddyCard {
  cardName: string;
  /** Fraction of decks containing the locked card that also contain this buddy. */
  coOccurrenceRate: number;
  /** Raw count behind coOccurrenceRate — decks containing both. */
  count: number;
}

/**
 * For each locked-in card, the other cards most often run alongside it — pure co-occurrence, not
 * win-rate-filtered like `useSuggestedBuild`'s main ranking. A card can be a strong "buddy" (played
 * together constantly, real deckbuilding synergy) without its combination ever clearing Card
 * Impact's with/without sample bar or showing a notable lift — this is a deliberately separate,
 * unfiltered lens ("what do people actually run with this") so a viewer can pull in a synergistic
 * pick the win-rate ranking would never surface on its own.
 */
export function useBuddyCards(
  rows: DeckBuilderRow[],
  spiritFilter: string | null,
  lockedCards: Map<string, number>,
  excludeNames: Set<string>,
): Map<string, BuddyCard[]> {
  return useMemo(() => {
    const result = new Map<string, BuddyCard[]>();
    if (rows.length === 0 || lockedCards.size === 0) return result;

    const spiritRows = spiritFilter === null ? rows : rows.filter((r) => r.spiritName === spiritFilter);

    for (const lockedName of lockedCards.keys()) {
      const withLocked = spiritRows.filter((r) => r.main.has(lockedName) || r.material.has(lockedName));
      if (withLocked.length === 0) {
        result.set(lockedName, []);
        continue;
      }

      const counts = new Map<string, number>();
      for (const row of withLocked) {
        for (const name of row.main.keys()) {
          if (name === lockedName || excludeNames.has(name)) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
        for (const name of row.material.keys()) {
          if (name === lockedName || excludeNames.has(name)) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }
      }

      const buddies = Array.from(counts.entries())
        .filter(([, count]) => count >= MIN_SUPPORT)
        .map(([cardName, count]) => ({ cardName, count, coOccurrenceRate: count / withLocked.length }))
        .sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate)
        .slice(0, MAX_BUDDIES_PER_CARD);
      result.set(lockedName, buddies);
    }

    return result;
  }, [rows, spiritFilter, lockedCards, excludeNames]);
}
