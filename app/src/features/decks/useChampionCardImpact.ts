import { useMemo } from "react";
import { computeCardImpactEntries, decodeCardLines, type CardImpactEntry, type CardSectionRow, type DeckSections } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckSightingsData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { computeDeckIdentity } from "../../lib/deckIdentity";

/** Mirrors pipeline/src/config.ts's defaults — that config reads `process.env`, which doesn't exist client-side, so these are plain literals kept in sync by hand. */
const PRIOR_WEIGHT = 10;
const MIN_SAMPLE_SIZE = 5;
const MAX_RESULTS = 8;

export interface ChampionCardImpactResult {
  cards: CardImpactEntry[];
  totalDecks: number;
  loading: boolean;
}

/**
 * Card Impact scoped to every deck of one Champion (optionally narrowed to decks sharing at least
 * one of `selectedElements`), computed client-side — the fallback recommendation for the ~99% of
 * decks that aren't part of a named-build cluster (see cardImpact.ts's `deckClusterIndex`) and so
 * get nothing from the precise, pipeline-computed Card Impact. Unlike that cluster-scoped version,
 * this population is open-ended (the viewer picks which elements count via checkboxes), so it
 * can't be precomputed pipeline-side the way clusters are — same reasoning `useCardCombination`
 * and `useDeckPopularity`'s champion filter already use for their own on-the-fly computations.
 */
export function useChampionCardImpact(
  championName: string | null,
  selectedElements: string[],
  excludeCardNames: Set<string>,
): ChampionCardImpactResult {
  const rawCardIndexData = useDeckCardIndexData();
  // Guards against a stale IndexedDB copy from before dictionary-encoding shipped — see the same
  // guard in useCardCombination.ts/useDeckPopularity.ts for why.
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const sightingsData = useDeckSightingsData();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  const result = useMemo((): ChampionCardImpactResult => {
    if (!championName || !cardIndexData || !sightingsData) return { cards: [], totalDecks: 0, loading: !cardIndexData || !sightingsData };

    // Filter by Champion first, via the cheap sightings lookup, before touching the (20MB+)
    // deck-card-index dataset — same ordering useDeckPopularity.ts already uses for its own
    // championFilter, so only this Champion's decks (not all 57k+) get decoded below.
    const winRateByDeckId = new Map<string, number>();
    for (const s of sightingsData.sightings) {
      if (s.championName === championName) winRateByDeckId.set(s.deckId, s.winRate);
    }
    if (winRateByDeckId.size === 0) return { cards: [], totalDecks: 0, loading: false };

    const rows: CardSectionRow[] = [];
    for (const entry of cardIndexData.decks) {
      const winRate = winRateByDeckId.get(entry.deckId);
      if (winRate === undefined) continue;

      const main = decodeCardLines(entry.main, cardIndexData.cardNames);
      const material = decodeCardLines(entry.material, cardIndexData.cardNames);
      const sideboard = decodeCardLines(entry.sideboard, cardIndexData.cardNames);

      if (selectedElements.length > 0) {
        const identity = computeDeckIdentity([...main, ...material], cardsByName);
        if (!identity.elements.some((e) => selectedElements.includes(e))) continue;
      }

      const sections: DeckSections = {
        main: new Set(main.map((l) => l.name)),
        material: new Set(material.map((l) => l.name)),
        sideboard: new Set(sideboard.map((l) => l.name)),
      };
      rows.push({ sections, outcome: winRate });
    }

    if (rows.length === 0) return { cards: [], totalDecks: 0, loading: false };

    // Shrink toward this population's own average win rate, not a flat 50% — same reasoning
    // cardImpact.ts documents for its cluster-scoped version.
    const baseline = rows.reduce((sum, r) => sum + r.outcome, 0) / rows.length;
    const entries = computeCardImpactEntries(rows, baseline, PRIOR_WEIGHT, MIN_SAMPLE_SIZE);
    const cards = entries.filter((c) => !excludeCardNames.has(c.cardName)).slice(0, MAX_RESULTS);

    return { cards, totalDecks: rows.length, loading: false };
  }, [championName, selectedElements, excludeCardNames, cardIndexData, sightingsData, cardsByName]);

  return result;
}
