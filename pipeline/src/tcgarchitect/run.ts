import { config } from "../config.js";
import { crawlDiscoverListing } from "./client.js";
import { transformTcgArchitectDeck } from "./transform.js";
import { readCachedTcgArchitectDeck, writeCachedTcgArchitectDeck, writeTcgArchitectHarvestMeta } from "./cache.js";
import { buildTcgArchitectIndex, writeTcgArchitectData } from "./build.js";
import { isShuttingDown } from "./shutdown.js";

/** How many consecutive full pages with nothing new/changed before an incremental run assumes
 * everything deeper is already known too — same early-stop reasoning as ShoutAtYourDecks'
 * `CONSECUTIVE_KNOWN_PAGES_TO_STOP` (see its harvest.ts), but comparing each deck's own
 * `updated_at` rather than just id presence, since this site conveniently reports edits. Skipped
 * entirely on a cold cache (nothing to compare against, every deck counts as new). */
const CONSECUTIVE_UNCHANGED_PAGES_TO_STOP = 3;

/**
 * Walks the discover listing (newest-first) and writes every deck's *complete* record straight to
 * cache — see client.ts's doc comment on why there's no separate metadata-then-decklist split here,
 * unlike ShoutAtYourDecks. Safe to interrupt and re-run: always restarts at page 1, and a deck
 * already cached with an unchanged `updated_at` is skipped, so a warm cache makes a re-run cheap
 * even though it always re-fetches page 1 onward (the listing gives no cheaper way to ask "what's
 * new since last time").
 */
export async function runHarvest(): Promise<void> {
  let newOrUpdated = 0;
  let consecutiveUnchangedPages = 0;

  const result = await crawlDiscoverListing(async (apiDecks, page, lastPage) => {
    if (isShuttingDown()) return { stop: true };

    const fetchedAt = new Date().toISOString();
    let anyChangedOnPage = false;
    for (const apiDeck of apiDecks) {
      const existing = await readCachedTcgArchitectDeck(apiDeck.id);
      if (existing && existing.deck.updatedAt === apiDeck.updated_at) continue;
      const deck = transformTcgArchitectDeck(apiDeck, fetchedAt);
      await writeCachedTcgArchitectDeck({ id: deck.id, deck });
      newOrUpdated++;
      anyChangedOnPage = true;
    }

    console.log(`tcgarchitect: page ${page}/${lastPage} done (${newOrUpdated} new/updated so far)`);
    await writeTcgArchitectHarvestMeta({ lastPageHarvested: page, deckCount: newOrUpdated, updatedAt: new Date().toISOString() });

    consecutiveUnchangedPages = anyChangedOnPage ? 0 : consecutiveUnchangedPages + 1;
    const stop = !config.fastMode && consecutiveUnchangedPages >= CONSECUTIVE_UNCHANGED_PAGES_TO_STOP;
    if (stop) {
      console.log(`tcgarchitect: stopping early at page ${page} — ${consecutiveUnchangedPages} consecutive pages with nothing new/changed`);
    }
    return { stop };
  });

  console.log(`tcgarchitect: harvest done — ${newOrUpdated} new/updated decks over ${result.pagesFetched} pages (${result.totalKnownDecks} known total on site)`);
}

export async function runBuild(): Promise<void> {
  const index = await buildTcgArchitectIndex();
  await writeTcgArchitectData(index);
}
