/** Published shapes for pipeline/src/tcgarchitect/ — the tcgarchitect.com community deck-builder
 * integration (third source alongside ShoutAtYourDecks and Sleeved — see
 * pipeline/src/tcgarchitect/README.md). Deliberately structurally identical (same field names) to
 * `ShoutAtYourDecksDeckSummary`/`Deck` (shoutatyourdecks-types.ts), same reasoning as
 * `sleeved-types.ts` — this is what would let a future `community/blend.ts` change pass a
 * concatenation of all three sources into the existing shoutatyourdecks/analytics/* compute
 * functions unmodified. Not wired into that blend yet (standalone dataset, same "deliberate future
 * step" scoping ShoutAtYourDecks' own README describes). */

import type { DeckLine, DeckFormat, DeckFormatConfidence } from "./shoutatyourdecks-types.js";

/**
 * A deck as returned by tcgarchitect.com's own `/api/decks/discover/public` listing — unlike
 * ShoutAtYourDecks/Sleeved, this single response already carries the complete decklist (every
 * card + its `pivot.quantity`/`pivot.deck_type`), so there is no separate cheap-metadata phase:
 * `TcgArchitectDeckSummary` is only ever produced alongside the full decklist. `id` is a
 * tcgarchitect.com deck UUID, not comparable to a ShoutAtYourDecks or Sleeved id.
 */
export interface TcgArchitectDeckSummary {
  id: string;
  url: string;
  title: string;
  author: string;
  champion: string | null;
  /** Always null — the listing/detail responses carry no deck-level price, only per-card
   * per-edition `low_price` fields (340+ per deck page), and replicating the site's own
   * cheapest-edition selection logic wasn't worth it for v1. Same precedent as Sleeved. */
  priceLow: number | null;
  materialCount: number | null;
  mainCount: number | null;
  sideCount: number;
  fetchedAt: string;
  format?: DeckFormat;
  formatConfidence?: DeckFormatConfidence;
  likeCount: number;
  /** The deck's own `created_at`/`updated_at` from the site (not `fetchedAt`) — lets a future
   * incremental harvest detect an edited deck by comparing against the previously cached value. */
  createdAt: string;
  updatedAt: string;
}

/**
 * The full decklist. `main`/`material`/`sideboard` map onto the same zones ShoutAtYourDecks/Sleeved
 * decks use. `pantheonDeck` maps from the site's `boons` deck_type (Pantheon format's Boon zone,
 * same concept as ShoutAtYourDecks' `pantheonDeck`). The site's own `maybeboard` deck_type
 * (a wishlist zone, not committed deck content) is deliberately dropped — not part of deck
 * identity per CLAUDE.md's convention, and not equivalent to a real sideboard/extra zone either.
 */
export interface TcgArchitectDeck extends TcgArchitectDeckSummary {
  materialDeck: DeckLine[];
  pantheonDeck?: DeckLine[];
  mainDeck: DeckLine[];
  sideDeck: DeckLine[];
}
