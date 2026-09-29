/** Published shape for pipeline/src/silvie/ — community card-art tags from silvie.gg's Art Tagger.
 * Tags describe what a printing's artwork shows (characters, creatures, themes) plus a few
 * gameplay-ish labels the community added; they are crowd-sourced and mostly unreviewed, so the
 * UI must credit silvie.gg and never treat them as authoritative card data. No tagger identity
 * (user ids, votes, leaderboard) is ever kept — only the tag names and which printings carry them. */

export type CardTagStatus = "approved" | "pending" | "review";

export interface CardTagDefinition {
  name: string;
  /** silvie.gg's moderation state for the tag itself (individual card links are almost all unreviewed). */
  status: CardTagStatus;
  /** Distinct cards (not printings) carrying this tag after mapping to our catalog. */
  cardCount: number;
}

export interface CardTagsData {
  generatedAt: string;
  source: "silvie.gg";
  sourceUrl: string;
  /** Sorted by cardCount desc, then name; indices into this array are used by `editions`/`cards`. */
  tags: CardTagDefinition[];
  /** Edition uuid → tag indices, for picking the matching artwork. */
  editions: Record<string, number[]>;
  /** Card uuid → union of every printing's tag indices. */
  cards: Record<string, number[]>;
}
