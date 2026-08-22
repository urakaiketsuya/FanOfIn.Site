import { useMemo } from "react";
import { decodeCardLines, type Card, type DeckCardIndexData, type DeckPopularityIndexData } from "@gatcg/shared";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";

export interface DecodedDeck {
  deckId: string;
  championName: string | null;
  spiritName: string | null;
  main: Map<string, number>;
  material: Map<string, number>;
  sideboard: Map<string, number>;
  winRate: number;
}

/** Same detection rule as pipeline/src/analysis/decklists.ts's findSpirit — CHAMPION type, SPIRIT subtype, lives in the Material Deck. Spirit isn't published at individual-deck grain anywhere (only pipeline-side per-Champion aggregates), so it's derived here client-side from the card catalog's own types/subtypes. */
function findSpiritName(material: { name: string; quantity: number }[], cardsByName: Map<string, Card>): string | null {
  for (const line of material) {
    const card = cardsByName.get(line.name);
    if (card?.types.includes("CHAMPION") && card.subtypes.includes("SPIRIT")) return line.name;
  }
  return null;
}

/**
 * Every deck in `deck-card-index.json`, decoded once (main/material/sideboard as name->quantity
 * maps, not just presence) with its Champion (straight from `deck-popularity-index.json`, no
 * re-derivation needed) and Spirit companion attached — the shared foundation every Guided Deck
 * Builder suggestion pool filters over, instead of each pool re-decoding the same ~57k decks its
 * own way. Not scoped to any one Champion: `useDeckBuilderPopulation.ts`'s "this Champion's decks"
 * population is just a filter over this, and every cross-Champion pool (same Spirit/class/nearest
 * deck/archetype cluster, regardless of Champion) needs the full universe anyway.
 */
export function decodeAllDecks(
  cardIndexData: DeckCardIndexData | undefined,
  popularityIndexData: DeckPopularityIndexData | undefined,
  cardsByName: Map<string, Card>,
): DecodedDeck[] {
  if (!cardIndexData?.cardNames || !popularityIndexData) return [];

  const infoByDeckId = new Map<string, { championName: string | null; winRate: number }>();
  for (const s of popularityIndexData.entries) {
    infoByDeckId.set(s.deckId, { championName: s.championName, winRate: s.winRate });
  }

  const decks: DecodedDeck[] = [];
  for (const entry of cardIndexData.decks) {
    const info = infoByDeckId.get(entry.deckId);
    if (!info) continue;

    const mainLines = decodeCardLines(entry.main, cardIndexData.cardNames);
    const materialLines = decodeCardLines(entry.material, cardIndexData.cardNames);
    const sideboardLines = decodeCardLines(entry.sideboard, cardIndexData.cardNames);

    decks.push({
      deckId: entry.deckId,
      championName: info.championName,
      spiritName: findSpiritName(materialLines, cardsByName),
      main: new Map(mainLines.map((l) => [l.name, l.quantity])),
      material: new Map(materialLines.map((l) => [l.name, l.quantity])),
      sideboard: new Map(sideboardLines.map((l) => [l.name, l.quantity])),
      winRate: info.winRate,
    });
  }
  return decks;
}

/** Drops the Champion field a `DecodedDeck` carries — every pool population is fed to `useSuggestedBuild.ts` as a `DeckBuilderRow[]`, which has no Champion field since it's assembled from a set of rows that (for the Champion-scoped pools) all already share one. */
export function decodedDeckToRow(d: DecodedDeck): { deckId: string; main: Map<string, number>; material: Map<string, number>; sideboard: Map<string, number>; spiritName: string | null; winRate: number } {
  return { deckId: d.deckId, main: d.main, material: d.material, sideboard: d.sideboard, spiritName: d.spiritName, winRate: d.winRate };
}

export interface AllDecodedDecks {
  decks: DecodedDeck[];
  loading: boolean;
}

/** Reactive wrapper over `decodeAllDecks` — one decode per (cardIndexData, popularityIndexData, catalog) change, shared by every hook that needs the full deck universe. */
export function useAllDecodedDecks(): AllDecodedDecks {
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const popularityIndexData = useDeckPopularityIndexData();
  const cardCatalog = useCardCatalog();
  const cardsByName = useMemo(() => new Map(cardCatalog.map((c) => [c.name, c])), [cardCatalog]);

  const decks = useMemo(
    () => decodeAllDecks(cardIndexData, popularityIndexData, cardsByName),
    [cardIndexData, popularityIndexData, cardsByName],
  );

  return { decks, loading: !cardIndexData || !popularityIndexData };
}
