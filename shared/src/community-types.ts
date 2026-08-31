/** Published shape for pipeline/src/community/blend.ts's data/community/sources.json — see
 * docs/CALCULATIONS.md, "Community population (blended)". */

import type { DeckFormat } from "./shoutatyourdecks-types.js";

export interface CommunitySourceCounts {
  generatedAt: string;
  byFormat: Record<DeckFormat, { shoutatyourdecks: number; sleeved: number; tcgarchitect: number }>;
}
