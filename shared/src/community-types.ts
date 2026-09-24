/** Published shape for pipeline/src/community/blend.ts's data/community/sources.json — see
 * docs/CALCULATIONS.md, "Community population (blended)". */

import type { DeckFormat } from "./shoutatyourdecks-types.js";

export interface CommunitySourceCounts {
  generatedAt: string;
  byFormat: Record<DeckFormat, { shoutatyourdecks: number; sleeved: number; tcgarchitect: number }>;
}

export type CommunityDeckSource = "shoutatyourdecks" | "sleeved" | "tcgarchitect";

/** Compact client-side search index for locally published community decklists. Card names are
 * dictionary encoded once at the top level so the browser can search the full archive without
 * downloading every full deck JSON file. Main + material define searchable deck identity;
 * sideboards are intentionally excluded. */
export interface CommunityDeckSearchIndex {
  generatedAt: string;
  cardNames: string[];
  decks: CommunityDeckSearchEntry[];
}

export interface CommunityDeckSearchEntry {
  id: string;
  source: CommunityDeckSource;
  url: string;
  title: string;
  author: string;
  champion: string | null;
  mainCount: number | null;
  materialCount: number | null;
  cardIndexes: number[];
}
