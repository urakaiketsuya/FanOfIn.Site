/** A single line in a decklist zone, as exported by the site's own "Omnidex Export" text format. */
export interface DeckLine {
  name: string;
  quantity: number;
}

export type DeckFormat = "STANDARD" | "PANTHEON" | "UNKNOWN";
export type DeckFormatConfidence = "declared" | "inferred" | "unknown";

/**
 * Cheap, HTTP-only data — pulled from a deck page's server-prerendered HTML (meta tags + the
 * "Material (N)" / "Main (N)" / "Side (N)" section headers). No browser needed to obtain this;
 * see metadataFetch.ts. Populated for every harvested deck, kept or not — the filter runs on
 * this shape before anything pays for a browser-driven full decklist fetch.
 */
export interface ShoutAtYourDecksDeckSummary {
  id: string;
  url: string;
  title: string;
  author: string;
  champion: string | null;
  priceLow: number | null;
  materialCount: number | null;
  mainCount: number | null;
  sideCount: number;
  fetchedAt: string;
  /** Source-declared format when available; older cached records are classified during publish. */
  format?: DeckFormat;
  formatConfidence?: DeckFormatConfidence;
  /** Optional lean browse metadata published for locally stored Pantheon lists. */
  cardNames?: string[];
  boonNames?: string[];
}

/**
 * The full decklist, only ever fetched for decks that already passed the filter (see filter.ts) —
 * requires a live browser session per deck (decklistFetch.ts), since quantities and the complete
 * Main deck aren't in the prerendered HTML.
 */
export interface ShoutAtYourDecksDeck extends ShoutAtYourDecksDeckSummary {
  materialDeck: DeckLine[];
  /** Pantheon zone, containing the deck's selected Boon cards. */
  pantheonDeck?: DeckLine[];
  mainDeck: DeckLine[];
  sideDeck: DeckLine[];
}
