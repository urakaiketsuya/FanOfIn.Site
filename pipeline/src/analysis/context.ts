import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures, type DeckSignature } from "./decklists.js";

/**
 * Shared, pipeline-only per-run context that replaces each analysis module's own `(bundles,
 * cardIndex)` parameter pair. `buildEventDeckSignatures(bundle.decklists, cardIndex)` is a pure
 * function of its inputs, and 9 analysis modules were each calling it independently for the same
 * bundle against the same cardIndex — `getEventSignatures` caches that result per bundle so the
 * work happens once per run instead of once per module. See docs/CALCULATIONS.md.
 */
export interface AnalysisContext {
  readonly cardIndex: Map<string, CardSignature>;
  getEventSignatures(bundle: OmnidexEventBundle): Map<number, DeckSignature>;
}

export function createAnalysisContext(cardIndex: Map<string, CardSignature>): AnalysisContext {
  const cache = new Map<number, Map<number, DeckSignature>>();

  function getEventSignatures(bundle: OmnidexEventBundle): Map<number, DeckSignature> {
    let signatures = cache.get(bundle.id);
    if (!signatures) {
      signatures = "error" in bundle.decklists ? new Map() : buildEventDeckSignatures(bundle.decklists, cardIndex);
      cache.set(bundle.id, signatures);
    }
    return signatures;
  }

  return { cardIndex, getEventSignatures };
}
