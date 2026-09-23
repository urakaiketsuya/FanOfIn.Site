import type { BookmarkedDeck, SavedDeck, TournamentDeckFavorite } from "@gatcg/shared";

export interface DeckLibraryResult {
  decks: SavedDeck[];
  bookmarks: BookmarkedDeck[];
  tournamentFavorites: TournamentDeckFavorite[];
  optionalLoadFailed: boolean;
}

/** Keep a user's editable decks available when an optional social endpoint is unavailable. */
export async function loadDeckLibrary(requests: {
  decks: () => Promise<{ decks: SavedDeck[] }>;
  bookmarks: () => Promise<{ decks: BookmarkedDeck[] }>;
  tournamentFavorites: () => Promise<{ decks: TournamentDeckFavorite[] }>;
}): Promise<DeckLibraryResult> {
  const [owned, bookmarked, tournament] = await Promise.allSettled([
    requests.decks(),
    requests.bookmarks(),
    requests.tournamentFavorites(),
  ]);

  if (owned.status === "rejected") throw owned.reason;

  return {
    decks: owned.value.decks,
    bookmarks: bookmarked.status === "fulfilled" ? bookmarked.value.decks : [],
    tournamentFavorites: tournament.status === "fulfilled" ? tournament.value.decks : [],
    optionalLoadFailed: bookmarked.status === "rejected" || tournament.status === "rejected",
  };
}
