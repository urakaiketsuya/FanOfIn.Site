import { useMemo } from "react";
import { decodeCardLines, type Card } from "@gatcg/shared";
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
}

export interface DeckBuilderPopulation {
  rows: DeckBuilderRow[];
  /** Every Spirit actually run with this Champion, for populating the Spirit picker — not the full card catalog's Spirit list, most of which this Champion never plays. */
  spiritsPresent: string[];
  loading: boolean;
}

/** Same detection rule as pipeline/src/analysis/decklists.ts's findSpirit — CHAMPION type, SPIRIT subtype, lives in the Material Deck. */
function findSpiritName(material: { name: string; quantity: number }[], cardsByName: Map<string, Card>): string | null {
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
 */
export function useDeckBuilderPopulation(championName: string | null): DeckBuilderPopulation {
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const popularityIndexData = useDeckPopularityIndexData();
  const cardCatalog = useDebouncedValue(useCardCatalog(), 500);
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  return useMemo((): DeckBuilderPopulation => {
    if (!championName || !cardIndexData || !popularityIndexData)
      return { rows: [], spiritsPresent: [], loading: !cardIndexData || !popularityIndexData };

    const winRateByDeckId = new Map<string, number>();
    for (const s of popularityIndexData.entries) {
      if (s.championName === championName) winRateByDeckId.set(s.deckId, s.winRate);
    }
    if (winRateByDeckId.size === 0) return { rows: [], spiritsPresent: [], loading: false };

    const rows: DeckBuilderRow[] = [];
    const spirits = new Set<string>();
    for (const entry of cardIndexData.decks) {
      const winRate = winRateByDeckId.get(entry.deckId);
      if (winRate === undefined) continue;

      const mainLines = decodeCardLines(entry.main, cardIndexData.cardNames);
      const materialLines = decodeCardLines(entry.material, cardIndexData.cardNames);
      const sideboardLines = decodeCardLines(entry.sideboard, cardIndexData.cardNames);
      const spiritName = findSpiritName(materialLines, cardsByName);
      if (spiritName) spirits.add(spiritName);

      rows.push({
        deckId: entry.deckId,
        main: new Map(mainLines.map((l) => [l.name, l.quantity])),
        material: new Map(materialLines.map((l) => [l.name, l.quantity])),
        sideboard: new Map(sideboardLines.map((l) => [l.name, l.quantity])),
        spiritName,
        winRate,
      });
    }

    return { rows, spiritsPresent: Array.from(spirits).sort(), loading: false };
  }, [championName, cardIndexData, popularityIndexData, cardsByName]);
}
