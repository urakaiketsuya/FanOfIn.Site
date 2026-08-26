import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { DeckCardIndexEntry, DeckCardIndexLine, EncodedCardLine } from "@gatcg/shared";
import type { OmnidexEventBundle } from "../omnidex/cache.js";
import type { AnalysisContext } from "./context.js";
import { config } from "../config.js";

const FULL_CACHE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.cache/deck-card-index-full.json",
);

interface FullDeckCardIndexEntry {
  deckId: string;
  main: DeckCardIndexLine[];
  material: DeckCardIndexLine[];
  sideboard: DeckCardIndexLine[];
}

/**
 * Full (uncompressed, `{name, quantity}` per line) card contents of every public decklist. Kept
 * as a pipeline-internal working artifact — not published — since the encoded/dictionary form
 * below is what the app actually fetches; this stays available on disk for debugging or
 * regenerating the encoding without re-walking every event bundle.
 */
function computeFullDeckCardIndex(bundles: OmnidexEventBundle[], ctx: AnalysisContext): FullDeckCardIndexEntry[] {
  const entries: FullDeckCardIndexEntry[] = [];

  for (const bundle of bundles) {
    if ("error" in bundle.decklists) continue;
    const signatures = ctx.getEventSignatures(bundle);

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

/** Encodes `{name, quantity}` lines into `[cardNameIndex, quantity]` tuples against a shared dictionary — see the doc comment on `DeckCardIndexEntry` for why. */
function encodeLines(lines: DeckCardIndexLine[], nameToIndex: Map<string, number>): EncodedCardLine[] {
  return lines.map((line) => {
    let index = nameToIndex.get(line.name);
    if (index === undefined) {
      index = nameToIndex.size;
      nameToIndex.set(line.name, index);
    }
    return [index, line.quantity];
  });
}

/**
 * Full card contents (by section) of every public decklist — the raw material for the "which
 * cards get played together" filter on the Card Stats page. Deliberately separate from
 * DeckSightingsData (event/player context) so that dataset can stay lean while this one carries
 * the bulkier per-card membership data, joinable back by `deckId`.
 *
 * Publishes the dictionary-encoded form (see `EncodedCardLine`) — the full, human-readable form
 * is only written to `pipeline/.cache/deck-card-index-full.json` when GATCG_DEBUG_ARTIFACTS=1
 * (see config.debugArtifacts); a normal run skips the ~89MB serialization/write since nothing
 * downstream reads that file.
 */
export async function computeDeckCardIndex(
  bundles: OmnidexEventBundle[],
  ctx: AnalysisContext,
): Promise<{ cardNames: string[]; entries: DeckCardIndexEntry[] }> {
  const full = computeFullDeckCardIndex(bundles, ctx);

  if (config.debugArtifacts) {
    await mkdir(path.dirname(FULL_CACHE_PATH), { recursive: true });
    await writeFile(FULL_CACHE_PATH, JSON.stringify(full), "utf-8");
  }

  const nameToIndex = new Map<string, number>();
  const entries: DeckCardIndexEntry[] = full.map((entry) => ({
    deckId: entry.deckId,
    main: encodeLines(entry.main, nameToIndex),
    material: encodeLines(entry.material, nameToIndex),
    sideboard: encodeLines(entry.sideboard, nameToIndex),
  }));

  const cardNames = Array.from(nameToIndex.keys());
  return { cardNames, entries };
}
