import { useMemo } from "react";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";

export { buildPopularDeck, canonicalSignature, type PopularDeck } from "./popularityAggregation";
import { getPopularDecks, type PopularDeck } from "./popularityAggregation";

const MIN_PLAYERS = 2;

interface PopularityResult {
  decks: PopularDeck[];
  loading: boolean;
}

/**
 * Groups every public decklist by its exact main+material card list – distinct from Champions
 * (character-level) and Archetypes (class+element-level), this surfaces specific builds multiple
 * different players independently converged on (or netdecked). Computed client-side from the
 * already-published deck-card-index + deck-popularity-index datasets, same pattern as
 * useCardCombination. Uses the lean popularity index (not the full deck-sightings.json, 40MB+)
 * since this only needs championName/winRate/event-context, not every sighting's full detail –
 * a real mobile-crash cause when this and deck-card-index.json were both required in full just to
 * render Popular Decks / All Decks (see git history around the fix).
 */
export function useDeckPopularity(
  championFilter: string | null,
  minPlayers: number = MIN_PLAYERS,
  /** Skips the expensive decode-and-group-all-~57k-decks pass entirely when the caller doesn't
   * need the full universe this render – e.g. `DeckDetail`'s `deckHash` fast path only falls back
   * to this for the rare deck with no precomputed hash, or when its Similar Decks tab is open. */
  enabled = true,
): PopularityResult {
  const rawCardIndexData = useDeckCardIndexData(enabled);
  // Guards against a stale IndexedDB copy from before dictionary-encoding shipped – see the same
  // guard in useCardCombination.ts for why.
  const cardIndexData = enabled && rawCardIndexData?.cardNames ? rawCardIndexData : undefined;
  const sightingsData = useDeckPopularityIndexData(enabled);
  const cardCatalog = useCardCatalog(enabled);

  // Build the expensive all-decks aggregation once per published dataset. Champion and minimum-
  // player filters are applied afterward so changing either control does not decode and regroup
  // the entire 20MB+ card index again.
  const allDecks = useMemo(() => {
    if (!enabled || !cardIndexData || !sightingsData) return [];

    return getPopularDecks(cardIndexData, sightingsData, cardCatalog);
  }, [enabled, cardIndexData, sightingsData, cardCatalog]);

  const decks = useMemo(
    () =>
      allDecks.filter(
        (deck) => deck.playerCount >= minPlayers && (!championFilter || deck.championName === championFilter),
      ),
    [allDecks, championFilter, minPlayers],
  );

  return { decks, loading: enabled && (!cardIndexData || !sightingsData) };
}
