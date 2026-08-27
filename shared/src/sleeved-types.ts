/** Published shapes for pipeline/src/sleeved/ — the sleeved.gg community deck-builder API integration.
 * Deliberately structurally identical (same field names) to ShoutAtYourDecksDeckSummary/Deck
 * (shoutatyourdecks-types.ts) even though this is a separate source with its own doc comments —
 * that identical shape is what lets pipeline/src/community/blend.ts pass a concatenation of both
 * sources straight into the existing shoutatyourdecks/analytics/* compute functions unmodified. See
 * docs/CALCULATIONS.md, "Sleeved analytics". */

import type { DeckLine, DeckFormat, DeckFormatConfidence } from "./shoutatyourdecks-types.js";

/**
 * A deck as returned by sleeved.gg's bulk `/decks/details` endpoint, transformed into our shape.
 * Sleeved has no separate cheap-metadata phase the way ShoutAtYourDecks does (its public listing
 * endpoint only returns `{id, gameId, createdAt, updatedAt}` — everything else, including the deck
 * name, only comes back from the bulk-details call) — so `SleevedDeckSummary` is only ever produced
 * alongside the full decklist, never fetched independently. `id` is a Sleeved deck UUID, not
 * comparable to a ShoutAtYourDecks id.
 *
 * `author`: confirmed live against the real API that a deck's bulk-details response carries no
 * owner/display-name field at all (the docs' example showing `ownerDisplayName` doesn't match the
 * real payload) — always the fixed string below rather than a fabricated identity. Kept as a
 * non-null `string` (not `null`) so this stays structurally identical to `ShoutAtYourDecksDeckSummary`.
 */
export const SLEEVED_AUTHOR_PLACEHOLDER = "Sleeved player";

export interface SleevedDeckSummary {
  id: string;
  url: string;
  title: string;
  author: string;
  champion: string | null;
  /** Sleeved's deck-details response carries no price data — always null, same as an unresolved-price ShoutAtYourDecks deck; priceDistribution.ts already filters these out for free. */
  priceLow: number | null;
  materialCount: number | null;
  mainCount: number | null;
  sideCount: number;
  fetchedAt: string;
  format?: DeckFormat;
  formatConfidence?: DeckFormatConfidence;
}

/**
 * The full decklist. Confirmed live against real Grand Archive decks: `main`/`material`/`sideboard`
 * map onto the same zones ShoutAtYourDecks decks use (the docs' claimed fourth zoneId, `references`,
 * doesn't actually appear — real decks instead sometimes carry a single `extra` line, e.g. a
 * champion-specific Regalia/Item like "Powercell" or "Core Fractal", not present on every deck).
 * `extraDeck` captures that (and defensively, any other non-main/material/sideboard zoneId Sleeved
 * introduces later) — excluded from every deck-identity computation the same way sideboard already
 * is, since it's not part of "what is this deck" per `CLAUDE.md`'s convention.
 */
export interface SleevedDeck extends SleevedDeckSummary {
  materialDeck: DeckLine[];
  mainDeck: DeckLine[];
  sideDeck: DeckLine[];
  extraDeck: DeckLine[];
}
