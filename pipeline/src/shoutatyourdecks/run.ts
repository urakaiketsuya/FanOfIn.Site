import { config } from "../config.js";
import { sleep } from "../lib/http.js";
import { listCachedDecks, writeCachedDeck, writeProgress } from "./cache.js";
import { harvestDeckUrls } from "./harvest.js";
import { fetchDeckSummary } from "./metadataFetch.js";
import { shouldKeepDeck } from "./filter.js";
import { fetchDecklists } from "./decklistFetch.js";
import { buildShoutAtYourDecksIndex, writeShoutAtYourDecksData } from "./build.js";
import { isShuttingDown } from "./shutdown.js";

export async function runHarvest(): Promise<void> {
  const result = await harvestDeckUrls();
  console.log(
    `shoutatyourdecks: harvest done — ${result.newDecks} new decks over ${result.pagesHarvested} pages (${result.totalKnownDecks} known total)`,
  );
}

/** Fetches metadata (Phase 2) for every harvested deck that doesn't have it yet. Plain HTTP, safe at full scale. */
export async function runMetadataFetch(): Promise<void> {
  const pending = (await listCachedDecks()).filter((r) => !r.summary);
  const targets = config.fastMode ? pending.slice(0, config.sydFastModePageLimit * 24) : pending;
  console.log(`shoutatyourdecks: fetching metadata for ${targets.length} decks`);

  let done = 0;
  let failed = 0;
  for (const record of targets) {
    if (isShuttingDown()) {
      console.log(`shoutatyourdecks: stopping (shutdown requested) after ${done}/${targets.length} — each deck is already saved as it's fetched, just re-run to continue`);
      break;
    }
    // fetchHtml already retries transient failures internally (see lib/html.ts) — this catches
    // the case where even that's exhausted (e.g. a 502 from the site under load). One deck's
    // fetch failing shouldn't take down an hours-long run over 21k decks: log it and move on,
    // leaving `summary` unset so a future re-run picks it back up naturally (same as any other
    // not-yet-fetched deck) — confirmed necessary after a real run crashed on a single 502 at
    // 16,700/21,065 with no way to resume except restarting past everything already done.
    let summary;
    try {
      summary = await fetchDeckSummary(record.id, record.url);
    } catch (err) {
      failed++;
      console.warn(`shoutatyourdecks: metadata fetch failed for ${record.url}, skipping (will retry on next run)`, err instanceof Error ? err.message : err);
      continue;
    }
    await writeCachedDeck({ ...record, summary });
    done++;
    // Every deck write above is itself a checkpoint (resume just filters on `!r.summary` again) —
    // this periodic write is only for the progress.json heartbeat/visibility, not correctness.
    if (done % 100 === 0) {
      await writeProgress({ phase: "metadata", completed: done, total: targets.length, updatedAt: new Date().toISOString() });
      console.log(`shoutatyourdecks: metadata ${done}/${targets.length} done`);
    }
    await sleep(config.sydCrawlRequestDelayMs);
  }
  console.log(`shoutatyourdecks: metadata done — ${done} decks (${failed} failed, will retry on next run)`);
}

/** Fetches full decklists (Phase 3, browser-driven) only for decks that already passed the filter. */
export async function runDecklistFetch(): Promise<void> {
  const all = await listCachedDecks();
  const targets = all.filter((r) => r.summary && shouldKeepDeck(r.summary) && !r.deck).map((r) => r.summary!);
  const capped = config.fastMode ? targets.slice(0, config.sydFastModePageLimit * 24) : targets;
  console.log(`shoutatyourdecks: fetching full decklists for ${capped.length} filtered decks`);

  const recordsById = new Map(all.map((r) => [r.id, r]));
  const { fetched, mismatches } = await fetchDecklists(capped, async (result) => {
    const existing = recordsById.get(result.deck.id);
    await writeCachedDeck({ id: result.deck.id, url: result.deck.url, summary: existing?.summary ?? null, deck: result.deck });
  });
  console.log(`shoutatyourdecks: decklists done — ${fetched} fetched, ${mismatches} main-count mismatches`);
}

export async function runBuild(): Promise<void> {
  const index = await buildShoutAtYourDecksIndex();
  await writeShoutAtYourDecksData(index);
}
