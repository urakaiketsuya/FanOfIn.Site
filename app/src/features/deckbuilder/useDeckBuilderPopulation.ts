import { useMemo } from "react";
import { buildSpiritCanonicalNames, decodeCardLines, type Card } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";
import { useDebouncedValue } from "../../lib/useDebouncedValue";

export interface DeckBuilderRow {
  deckId: string;
  /** name -> total copies. Sideboard is still excluded from "deck identity" elsewhere in this codebase (Popular Decks, Archetypes, etc.), but the builder itself needs it to rank sideboard-tech suggestions. */
  main: Map<string, number>;
  material: Map<string, number>;
  sideboard: Map<string, number>;
  spiritName: string | null;
  winRate: number;
  /** ISO event date, used for recent-vs-prior metagame trend comparisons. */
  eventDate?: string;
}

export interface DeckBuilderPopulation {
  rows: DeckBuilderRow[];
  /** Every Spirit actually run with this Champion, for populating the Spirit picker — not the full card catalog's Spirit list, most of which this Champion never plays. Named-alter duplicates (see buildSpiritCanonicalNames) are already folded into their base name here, so this list has no fragmented near-duplicates. */
  spiritsPresent: string[];
  loading: boolean;
}

/** Same detection rule as pipeline/src/analysis/decklists.ts's findSpirit — CHAMPION type, SPIRIT subtype, lives in the Material Deck. */
export function findSpiritName(material: { name: string; quantity: number }[], cardsByName: Map<string, Card>): string | null {
  for (const line of material) {
    const card = cardsByName.get(line.name);
    if (card?.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")) return line.name;
  }
  return null;
}

/**
 * One Champion's decks, decoded directly rather than through the shared `useAllDecodedDecks()`
 * universe — deliberately kept separate from that hook (which the cross-Champion pools/nearest-
 * decks/archetype-Variants-tab use), since this is the path every single deck-builder visit runs
 * through by default, and `useAllDecodedDecks()`'s full ~57k-deck decode is expensive enough
 * (`deck-card-index.json` is 93MB+) that always paying it here — for what usually only needs one
 * Champion's few hundred decks — was itself the cause of a real memory-pressure bug (browsers,
 * Safari especially, silently killing and reloading the tab; see `usePublishedData.ts`'s own doc
 * comment on the same class of bug). Only decodes decks that actually match `championName`.
 *
 * `minEventDate`/`maxEventDate` (ISO strings, inclusive), when given, additionally restrict to
 * decks whose event falls in that range — the "recent season only" pool's filter, kept as plain
 * primitives rather than a `{start, end}` object so callers that recompute the range each render
 * (e.g. from `useLatestSeason()`) don't accidentally bust this hook's own memoization with a new
 * object reference every time.
 */
export function useDeckBuilderPopulation(championName: string | null, minEventDate?: string, maxEventDate?: string): DeckBuilderPopulation {
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const popularityIndexData = useDeckPopularityIndexData();
  const cardCatalog = useDebouncedValue(useCardCatalog(), 500);
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);
  const spiritCanonicalNames = useMemo(() => buildSpiritCanonicalNames(cardCatalog), [cardCatalog]);

  return useMemo((): DeckBuilderPopulation => {
    if (!championName || !cardIndexData || !popularityIndexData)
      return { rows: [], spiritsPresent: [], loading: !cardIndexData || !popularityIndexData };

    const infoByDeckId = new Map<string, { winRate: number; eventDate: string }>();
    for (const s of popularityIndexData.entries) {
      if (s.championName !== championName) continue;
      if (minEventDate && s.eventDate < minEventDate) continue;
      if (maxEventDate && s.eventDate > maxEventDate) continue;
      infoByDeckId.set(s.deckId, { winRate: s.winRate, eventDate: s.eventDate });
    }
    if (infoByDeckId.size === 0) return { rows: [], spiritsPresent: [], loading: false };

    const rows: DeckBuilderRow[] = [];
    const spirits = new Set<string>();
    for (const entry of cardIndexData.decks) {
      const info = infoByDeckId.get(entry.deckId);
      if (!info) continue;

      const mainLines = decodeCardLines(entry.main, cardIndexData.cardNames);
      const materialLines = decodeCardLines(entry.material, cardIndexData.cardNames);
      const sideboardLines = decodeCardLines(entry.sideboard, cardIndexData.cardNames);
      const rawSpiritName = findSpiritName(materialLines, cardsByName);
      const spiritName = rawSpiritName ? (spiritCanonicalNames.get(rawSpiritName) ?? rawSpiritName) : null;
      if (spiritName) spirits.add(spiritName);

      rows.push({
        deckId: entry.deckId,
        main: new Map(mainLines.map((l) => [l.name, l.quantity])),
        material: new Map(materialLines.map((l) => [l.name, l.quantity])),
        sideboard: new Map(sideboardLines.map((l) => [l.name, l.quantity])),
        spiritName,
        winRate: info.winRate,
        eventDate: info.eventDate,
      });
    }

    return { rows, spiritsPresent: Array.from(spirits).sort(), loading: false };
  }, [championName, cardIndexData, popularityIndexData, cardsByName, spiritCanonicalNames, minEventDate, maxEventDate]);
}
