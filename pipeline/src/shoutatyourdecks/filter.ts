import type { ShoutAtYourDecksDeckSummary } from "@gatcg/shared";
import { config } from "../config.js";

/**
 * Decides whether a deck is worth the browser cost of a full decklist fetch (Phase 3). Runs right
 * after the cheap HTTP metadata fetch (Phase 2) and before anything else — see
 * pipeline/src/shoutatyourdecks/README.md and docs/CALCULATIONS.md for the reasoning behind the
 * two thresholds.
 */
export function shouldKeepDeck(summary: ShoutAtYourDecksDeckSummary): boolean {
  if (summary.mainCount === null || summary.mainCount < config.sydMinMainDeckSize) return false;
  if (summary.title.toLowerCase().includes(config.sydTitleExcludePattern.toLowerCase())) return false;
  return true;
}
