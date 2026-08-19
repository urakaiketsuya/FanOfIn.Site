import { useMemo } from "react";
import { decodeCardLines, type Card } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";

export interface DeckBuilderRow {
  deckId: string;
  /** name -> total copies, main + material only — sideboard excluded, same "deck identity" convention used everywhere else in this codebase. */
  main: Map<string, number>;
  material: Map<string, number>;
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
 * Every deck of one Champion, decoded once (main/material as name->quantity maps, not just
 * presence — the deck-builder needs real copy counts to assemble a plausible build) with its
 * Spirit companion resolved client-side. Spirit isn't published at individual-deck grain anywhere
 * (only pipeline-side per-Champion aggregates in archetypes.json), so it's derived here the same
 * way computeDeckIdentity already derives elements client-side, from the card catalog's own
 * types/subtypes.
 */
export function useDeckBuilderPopulation(championName: string | null): DeckBuilderPopulation {
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const popularityIndexData = useDeckPopularityIndexData();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  return useMemo((): DeckBuilderPopulation => {
    if (!championName || !cardIndexData || !popularityIndexData)
      return { rows: [], spiritsPresent: [], loading: !cardIndexData || !popularityIndexData };

    const winRateByDeckId = new Map<string, number>();
    for (const s of popularityIndexData.entries) {
      if (s.championName === championName) winRateByDeckId.set(s.deckId, s.winRate);
    }

    const rows: DeckBuilderRow[] = [];
    const spirits = new Set<string>();
    for (const entry of cardIndexData.decks) {
      const winRate = winRateByDeckId.get(entry.deckId);
      if (winRate === undefined) continue;

      const mainLines = decodeCardLines(entry.main, cardIndexData.cardNames);
      const materialLines = decodeCardLines(entry.material, cardIndexData.cardNames);
      const spiritName = findSpiritName(materialLines, cardsByName);
      if (spiritName) spirits.add(spiritName);

      rows.push({
        deckId: entry.deckId,
        main: new Map(mainLines.map((l) => [l.name, l.quantity])),
        material: new Map(materialLines.map((l) => [l.name, l.quantity])),
        spiritName,
        winRate,
      });
    }

    return { rows, spiritsPresent: Array.from(spirits).sort(), loading: false };
  }, [championName, cardIndexData, popularityIndexData, cardsByName]);
}
