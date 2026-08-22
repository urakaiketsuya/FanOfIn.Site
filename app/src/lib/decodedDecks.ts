import { useMemo } from "react";
import { decodeCardLines, type Card, type DeckCardIndexData, type DeckPopularityIndexData } from "@gatcg/shared";
import { useDeckCardIndexData } from "../features/archetypes/data";
import { useDeckPopularityIndexData } from "../features/topdecks/data";
import { useCardCatalog } from "../features/cards/useCardCatalog";
import { useDebouncedValue } from "./useDebouncedValue";

/** How long the catalog has to go quiet before this hook redoes its ~57k-deck decode — long enough
 * to coalesce an entire catalog sync's run of `bulkPut` batches (`app/src/lib/sync/cards.ts`, ~50
 * cards per write) into one recompute at the end instead of one per batch. */
const CATALOG_SETTLE_MS = 500;

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
 * re-derivation needed) and Spirit companion attached — the shared foundation for every feature
 * that needs the full ~57k-deck universe: the Guided Deck Builder's cross-Champion suggestion
 * pools (`features/deckbuilder/`) and the Archetypes "Variants" tab (`features/archetypes/`) both
 * filter/score over this instead of each re-decoding the same decks its own way. Lives in
 * `app/src/lib/` (not either feature folder) since it's genuinely cross-feature, same as
 * `deckIdentity.ts`/`cardIntent.ts`/`cardSimilarity.ts`.
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

/** Drops the Champion field a `DecodedDeck` carries — the Guided Deck Builder's `useSuggestedBuild.ts` takes a `DeckBuilderRow[]`, which has no Champion field since it's assembled from a set of rows that (for the Champion-scoped pools) all already share one. */
export function decodedDeckToRow(d: DecodedDeck): { deckId: string; main: Map<string, number>; material: Map<string, number>; sideboard: Map<string, number>; spiritName: string | null; winRate: number } {
  return { deckId: d.deckId, main: d.main, material: d.material, sideboard: d.sideboard, spiritName: d.spiritName, winRate: d.winRate };
}

/** A deck's main+material as one multiset — "deck identity" convention used everywhere else in this codebase (sideboard is situational tech, excluded). */
export function combinedCardCounts(deck: DecodedDeck): Map<string, number> {
  const combined = new Map(deck.main);
  for (const [name, qty] of deck.material) combined.set(name, (combined.get(name) ?? 0) + qty);
  return combined;
}

/**
 * Weighted Jaccard (Ruzicka similarity) over each side's card-copy multiset — verbatim port of
 * `pipeline/src/analysis/similarity.ts`'s function of the same name (plain TS, no dependencies,
 * so this is a straight copy; keep the two in sync by hand if the formula ever changes). Iterates
 * the smaller map and does direct lookups against the larger one, same reasoning as the pipeline
 * version: avoids allocating a union `Set` on every one of the ~57k comparisons callers do against
 * the full deck universe.
 */
export function weightedJaccard(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const [key, smallValue] of small) {
    const largeValue = large.get(key);
    if (largeValue === undefined) continue;
    intersection += Math.min(smallValue, largeValue);
  }
  let aTotal = 0;
  for (const v of a.values()) aTotal += v;
  let bTotal = 0;
  for (const v of b.values()) bTotal += v;
  const union = aTotal + bTotal - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface AllDecodedDecks {
  decks: DecodedDeck[];
  loading: boolean;
}

/**
 * Reactive wrapper over `decodeAllDecks` — one decode per (cardIndexData, popularityIndexData,
 * catalog) change, shared by every hook that needs the full deck universe.
 *
 * This decode is genuinely expensive (deck-card-index.json is 93MB+, and decoding it means
 * building 3 Maps for each of ~57k decks) — real enough that this codebase's own
 * `usePublishedData.ts` already documents a browser-memory-pressure bug from concurrent large
 * parses (Safari silently killing and reloading the tab). `enabled` (default `true`, for existing
 * always-need-it callers like the archetypes Variants tab once its own tab is open) lets a caller
 * that only *sometimes* needs the full universe — e.g. the Guided Deck Builder's default,
 * single-Champion pool, which never needed more than that one Champion's decks — skip the decode
 * entirely rather than paying its cost on every page visit regardless of whether it's used.
 */
export function useAllDecodedDecks(enabled = true): AllDecodedDecks {
  const rawCardIndexData = useDeckCardIndexData();
  const cardIndexData = enabled && rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const rawPopularityIndexData = useDeckPopularityIndexData();
  const popularityIndexData = enabled ? rawPopularityIndexData : undefined;
  const cardCatalog = useCardCatalog();
  const settledCardCatalog = useDebouncedValue(cardCatalog, CATALOG_SETTLE_MS);
  const cardsByName = useMemo(() => new Map(settledCardCatalog.map((c) => [c.name, c])), [settledCardCatalog]);

  const decks = useMemo(
    () => (enabled ? decodeAllDecks(cardIndexData, popularityIndexData, cardsByName) : []),
    [enabled, cardIndexData, popularityIndexData, cardsByName],
  );

  return { decks, loading: enabled && (!cardIndexData || !popularityIndexData) };
}
