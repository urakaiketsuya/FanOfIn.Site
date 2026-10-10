import { useEffect, useMemo, useState } from "react";
import { useDeckCardIndexData } from "../archetypes/data";
import { useDeckPopularityIndexData } from "../topdecks/data";
import { useCardCatalog } from "../cards/useCardCatalog";

export { buildPopularDeck, canonicalSignature, type PopularDeck } from "./popularityAggregation";
import { type PopularDeck } from "./popularityAggregation";
import { loadPopularDecks, popularityKey } from "./popularityWorkerClient";
import { POPULARITY_ERROR } from "./popularityWorkerProtocol";
const EMPTY_DECKS: PopularDeck[] = [];

const MIN_PLAYERS = 2;

interface PopularityResult {
  decks: PopularDeck[];
  loading: boolean;
  error: string | undefined;
  retry: () => void;
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

  const input = useMemo(() => cardIndexData && sightingsData
    ? { cardIndex: cardIndexData, sightings: sightingsData, catalog: cardCatalog } : null,
  [cardIndexData, sightingsData, cardCatalog]);
  const key = useMemo(() => input ? popularityKey(input) : null, [input]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; decks: PopularDeck[]; error?: string } | null>(null);
  useEffect(() => {
    if (!enabled || !input || key === null) return;
    let active = true;
    loadPopularDecks(input, key).then(
      decks => { if (active) setState({ key, decks }); },
      () => { if (active) setState({ key, decks: EMPTY_DECKS, error: POPULARITY_ERROR }); },
    );
    return () => { active = false; };
  }, [enabled, input, key, attempt]);
  const result = enabled && key !== null && state?.key === key ? state : null;
  const allDecks = result?.decks ?? EMPTY_DECKS;

  const decks = useMemo(
    () =>
      allDecks.filter(
        (deck) => deck.playerCount >= minPlayers && (!championFilter || deck.championName === championFilter),
      ),
    [allDecks, championFilter, minPlayers],
  );

  return { decks, loading: enabled && !result, error: result?.error,
    retry: () => { setState(null); setAttempt(value => value + 1); } };
}
