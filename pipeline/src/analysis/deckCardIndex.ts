import type { DeckCardIndexEntry } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { CardSignature } from "../cards/catalog.js";
import { buildEventDeckSignatures } from "./decklists.js";

/**
 * Full card contents (by section) of every public decklist — the raw material for the "which
 * cards get played together" filter on the Card Stats page. Deliberately separate from
 * DeckSightingsData (event/player context) so that dataset can stay lean while this one carries
 * the bulkier per-card membership data, joinable back by `deckId`.
 */
export function computeDeckCardIndex(bundles: OmnidexEventBundle[], cardIndex: Map<string, CardSignature>): DeckCardIndexEntry[] {
  const entries: DeckCardIndexEntry[] = [];

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = buildEventDeckSignatures(bundle.decklists, cardIndex);

    for (const [player, sig] of signatures) {
      entries.push({
        deckId: `${bundle.id}:${player}`,
        main: sig.mainCards,
        material: sig.materialCards,
        sideboard: sig.sideboardCards,
      });
    }
  }

  return entries;
}
