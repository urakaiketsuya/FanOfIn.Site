import { useMemo } from "react";
import { computeCardImpactEntries, decodeCardLines, type CardImpactEntry, type CardSectionRow, type DeckSections } from "@gatcg/shared";
import { useDeckCardPresenceIndex } from "./useDeckCardPresenceIndex";
import { useDeckPopularityIndexData } from "../topdecks/data";

/** Mirrors pipeline/src/config.ts's defaults — see useChampionCardImpact.ts for why these are plain literals here. */
const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
const MAX_RESULTS = 15;

export interface CardSynergyRow extends CardSectionRow {
  championName: string | null;
}

/**
 * Compare cards after centering every Champion population on the same baseline. Without this,
 * Champion/material cards and archetype staples mostly measure that one Champion's overall win
 * rate rather than whether the candidate helps decks that already run the page card.
 */
export function computeChampionAdjustedSynergy(rows: CardSynergyRow[]): CardImpactEntry[] {
  if (rows.length === 0) return [];
  const baseline = rows.reduce((sum, row) => sum + row.outcome, 0) / rows.length;
  const byChampion = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const key = row.championName ?? "__unknown__";
    const bucket = byChampion.get(key) ?? { sum: 0, count: 0 };
    bucket.sum += row.outcome;
    bucket.count += 1;
    byChampion.set(key, bucket);
  }
  const adjustedRows = rows.map((row): CardSectionRow => {
    const bucket = byChampion.get(row.championName ?? "__unknown__")!;
    return { sections: row.sections, outcome: row.outcome - bucket.sum / bucket.count + baseline };
  });
  return computeCardImpactEntries(adjustedRows, baseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE)
    .filter((entry) => entry.adjustedLift > 0)
    .slice(0, MAX_RESULTS);
}

export interface CardSynergyResult {
  cards: CardImpactEntry[];
  totalDecks: number;
  loading: boolean;
}

/**
 * For every deck running this card, does *also* running a given other card correlate with a
 * higher win rate than running this card without it? Global, champion-agnostic version of the
 * same with/without/shrink core used everywhere else (`computeCardImpactEntries`) — the population
 * here is simply "every deck containing this card" rather than a Champion, Champion+Spirit, or
 * named-build cluster. The card itself never appears in its own results: every row in this
 * population already has it, so its own "without" bucket is always empty and fails the sample bar
 * automatically, no special-casing needed.
 */
export function useCardSynergy(cardName: string | null, enabled = true): CardSynergyResult {
  const presence = useDeckCardPresenceIndex(enabled);
  const popularityIndexData = useDeckPopularityIndexData(enabled);

  return useMemo((): CardSynergyResult => {
    if (!cardName || !presence || !popularityIndexData)
      return { cards: [], totalDecks: 0, loading: !presence || !popularityIndexData };

    const { data: cardIndexData, nameToIndex, presenceIndex } = presence;
    const resultByDeckId = new Map(popularityIndexData.entries.map((s) => [s.deckId, s]));

    // Candidate decks come straight from the presence index — no need to decode and string-match
    // every one of the ~57k published decks just to find the (typically far smaller) subset that
    // actually run this card. See useDeckCardPresenceIndex's doc comment.
    const cardNameIndex = nameToIndex.get(cardName);
    const matchingDeckIndices = cardNameIndex === undefined ? [] : presenceIndex.get(cardNameIndex);

    const rows: CardSynergyRow[] = [];
    for (const idx of matchingDeckIndices ?? []) {
      const entry = cardIndexData.decks[idx];
      const result = resultByDeckId.get(entry.deckId);
      if (!result) continue;

      const main = decodeCardLines(entry.main, cardIndexData.cardNames);
      const material = decodeCardLines(entry.material, cardIndexData.cardNames);
      const sideboard = decodeCardLines(entry.sideboard, cardIndexData.cardNames);

      const sections: DeckSections = {
        main: new Set(main.map((l) => l.name)),
        material: new Set(material.map((l) => l.name)),
        sideboard: new Set(sideboard.map((l) => l.name)),
      };
      rows.push({ sections, outcome: result.winRate, championName: result.championName });
    }

    if (rows.length === 0) return { cards: [], totalDecks: 0, loading: false };

    const cards = computeChampionAdjustedSynergy(rows);

    return { cards, totalDecks: rows.length, loading: false };
  }, [cardName, presence, popularityIndexData]);
}
