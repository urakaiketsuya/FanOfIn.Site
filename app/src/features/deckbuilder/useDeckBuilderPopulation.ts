import { useMemo } from "react";
import { useAllDecodedDecks, decodedDeckToRow } from "../../lib/decodedDecks";

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

/**
 * One Champion's decks, filtered from the shared `decodeAllDecks()` universe (`decodedDecks.ts`) —
 * this hook used to do its own decode+decode-cache; now it's a thin Champion filter over the same
 * shared decode every other suggestion pool (same Spirit/class/nearest deck/archetype cluster,
 * cross-Champion) also draws from, so a real decklist is only ever decoded once regardless of how
 * many pools are in play.
 */
export function useDeckBuilderPopulation(championName: string | null): DeckBuilderPopulation {
  const { decks, loading } = useAllDecodedDecks();

  return useMemo((): DeckBuilderPopulation => {
    if (!championName || loading) return { rows: [], spiritsPresent: [], loading };

    const rows: DeckBuilderRow[] = [];
    const spirits = new Set<string>();
    for (const d of decks) {
      if (d.championName !== championName) continue;
      rows.push(decodedDeckToRow(d));
      if (d.spiritName) spirits.add(d.spiritName);
    }

    return { rows, spiritsPresent: Array.from(spirits).sort(), loading: false };
  }, [championName, decks, loading]);
}
