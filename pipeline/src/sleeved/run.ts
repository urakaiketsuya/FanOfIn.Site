import { config } from "../config.js";
import { sleep } from "../lib/http.js";
import { loadCardCatalog, buildSlugIndex } from "../cards/catalog.js";
import { fetchPublicDeckIds, fetchDeckDetails } from "./client.js";
import { transformSleevedDeck } from "./transform.js";
import { readCachedSleevedDeck, writeCachedSleevedDeck, readSleevedHarvestMeta, writeSleevedHarvestMeta } from "./cache.js";
import { buildSleevedIndex, writeSleevedData } from "./build.js";

/** Discovers every public Grand Archive deck id and records them for `runFetchDetails` — cheap
 * (a handful of paginated listing calls), no card data yet. */
export async function runHarvest(): Promise<void> {
  const limit = config.fastMode ? config.sleevedFastModeDeckLimit : Infinity;
  const ids = await fetchPublicDeckIds(limit);
  await writeSleevedHarvestMeta({ knownDeckIds: ids, updatedAt: new Date().toISOString() });
  console.log(`sleeved: harvest done — ${ids.length} known public Grand Archive deck ids`);
}

/** Fetches full card data (Phase 2) for every known id that isn't cached yet. */
export async function runFetchDetails(): Promise<void> {
  const meta = await readSleevedHarvestMeta();
  if (!meta) {
    console.warn("sleeved: no harvest-meta.json found — run harvest first");
    return;
  }

  const pending: string[] = [];
  for (const id of meta.knownDeckIds) {
    if (!(await readCachedSleevedDeck(id))) pending.push(id);
  }
  console.log(`sleeved: fetching details for ${pending.length}/${meta.knownDeckIds.length} decks not yet cached`);
  if (pending.length === 0) return;

  const cardIndex = buildSlugIndex(await loadCardCatalog());
  const fetchedAt = new Date().toISOString();

  let done = 0;
  let totalUnresolved = 0;
  // Batches of ~50 ids per API call (see client.ts) — fetch a manageable chunk at a time so a
  // mid-run failure doesn't lose everything already fetched, same resumability spirit as
  // ShoutAtYourDecks' per-deck writes.
  const CHUNK = 200;
  for (let i = 0; i < pending.length; i += CHUNK) {
    const chunk = pending.slice(i, i + CHUNK);
    const { decks, unresolved } = await fetchDeckDetails(chunk);
    for (const apiDeck of decks) {
      const { deck, unresolvedCardIds } = transformSleevedDeck(apiDeck, cardIndex, fetchedAt);
      if (unresolvedCardIds.length > 0) {
        totalUnresolved += unresolvedCardIds.length;
        console.warn(`sleeved: deck ${apiDeck.id} had ${unresolvedCardIds.length} unresolved card slug(s): ${unresolvedCardIds.join(", ")}`);
      }
      await writeCachedSleevedDeck({ id: deck.id, deck });
      done++;
    }
    if (unresolved.length > 0) console.warn(`sleeved: ${unresolved.length} id(s) came back unresolved from /decks/details: ${unresolved.join(", ")}`);
    console.log(`sleeved: details ${done}/${pending.length} done`);
    if (i + CHUNK < pending.length) await sleep(config.sleevedCrawlRequestDelayMs);
  }
  console.log(`sleeved: fetch-details done — ${done} decks (${totalUnresolved} total unresolved card slugs across all decks)`);
}

export async function runBuild(): Promise<void> {
  const index = await buildSleevedIndex();
  await writeSleevedData(index);
}
