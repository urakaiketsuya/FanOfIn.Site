import type { OmnidexEvent } from "@gatcg/shared";
import { sleep } from "../lib/http.js";
import { config } from "../config.js";
import { omnidexApi } from "./api.js";
import { findMaxEventId, findYearStartId } from "./bounds.js";
import {
  readCachedBundle,
  writeCachedBundle,
  readMeta,
  writeMeta,
  writeProgress,
  seedCacheFromPublished,
  type OmnidexEventBundle,
} from "./cache.js";

export type CrawlMode =
  | { kind: "backfill-year"; year: number }
  | { kind: "incremental" }
  | { kind: "range"; startId: number; endId: number };

/** Once an event is complete or canceled its data never changes again — safe to never re-fetch. */
const TERMINAL_STATUSES = new Set(["complete", "canceled"]);

function isDeepFetchWorthy(event: OmnidexEvent): boolean {
  return event.status === "complete" && event.players.length >= config.minEventPlayers;
}

async function deepFetch(id: number, event: OmnidexEvent): Promise<OmnidexEventBundle> {
  const players = await omnidexApi.getPlayers(id);
  await sleep(config.crawlRequestDelayMs);
  const standings = await omnidexApi.getStandings(id);
  await sleep(config.crawlRequestDelayMs);

  const pairingsByRound = [];
  const rounds = config.fastMode ? Math.min(event.swissRounds ?? 0, 1) : (event.swissRounds ?? 0);
  for (let round = 1; round <= rounds; round++) {
    pairingsByRound.push(await omnidexApi.getPairings(id, round));
    await sleep(config.crawlRequestDelayMs);
  }

  const judges = await omnidexApi.getJudges(id);
  await sleep(config.crawlRequestDelayMs);
  const teams = await omnidexApi.getTeams(id);
  await sleep(config.crawlRequestDelayMs);
  const decklists = event.decklists ? await omnidexApi.getDecklists(id) : { error: "Decklists not public for this event." };
  await sleep(config.crawlRequestDelayMs);
  const statistics = await omnidexApi.getStatistics(id);
  await sleep(config.crawlRequestDelayMs);

  return {
    id,
    event,
    players,
    standings,
    pairingsByRound,
    judges,
    teams,
    decklists,
    statistics,
    fetchedAt: new Date().toISOString(),
  };
}

export interface CrawlResult {
  scanned: number;
  deepFetched: number;
  maxIdSeen: number;
}

/**
 * Walks a range of Omnidex event IDs, deep-fetching events that look substantial enough to
 * matter (see config.minEventPlayers) and skipping the rest. Cached completed/canceled events
 * are never re-fetched — idempotent re-runs only do work for events that are new or still in
 * progress. The published index (`build.ts`) is a separate step that reads whatever is in the
 * cache, so a crawl and a re-publish can happen independently.
 */
export async function crawlEvents(mode: CrawlMode): Promise<CrawlResult> {
  await seedCacheFromPublished();
  const priorMeta = await readMeta();

  let startId: number;
  let endId: number;

  if (mode.kind === "range") {
    ({ startId, endId } = mode);
  } else if (mode.kind === "backfill-year") {
    const maxId = await findMaxEventId();
    startId = await findYearStartId(mode.year, maxId);
    // Bounding endId to the *next* year's start (not always maxId) matters once backfills are
    // split one-process-per-year: without this, backfilling e.g. 2023 alone would scan every id
    // from 2023's start through today's frontier — years of IDs it'll just filter back out below —
    // since only deep-fetched events get cached, so most of that range can't short-circuit via the
    // cache and gets a fresh (rate-limited) getEvent call every single time. The current year has
    // no "next year start" yet, so it still scans to the live frontier.
    const isCurrentYear = mode.year >= new Date().getUTCFullYear();
    endId = isCurrentYear ? maxId : await findYearStartId(mode.year + 1, maxId);
    console.log(`omnidex: backfilling ${mode.year} — scanning ids ${startId}..${endId}`);
  } else {
    endId = await findMaxEventId();
    startId = priorMeta?.maxKnownId
      ? Math.max(1, priorMeta.maxKnownId - config.incrementalLookbackIds)
      : await findYearStartId(config.backfillYear, endId);
    console.log(`omnidex: incremental scan — ids ${startId}..${endId}`);
  }

  if (config.fastMode) {
    startId = Math.max(startId, endId - config.fastModeEventLimit);
    console.log(`omnidex: fast mode — limiting scan to ids ${startId}..${endId}`);
  }

  let scanned = 0;
  let deepFetched = 0;
  let maxIdSeen = Math.max(priorMeta?.maxKnownId ?? 0, startId - 1);
  let consecutive404s = 0;

  for (let id = startId; id <= endId; id++) {
    const cached = await readCachedBundle(id);
    if (cached && TERMINAL_STATUSES.has(cached.event.status)) {
      scanned++;
      maxIdSeen = Math.max(maxIdSeen, id);
      consecutive404s = 0;
      continue;
    }

    const event = await omnidexApi.getEvent(id);
    await sleep(config.crawlRequestDelayMs);

    if (!event) {
      consecutive404s++;
      if (consecutive404s >= config.new404StreakLimit) {
        console.log(`omnidex: ${consecutive404s} consecutive missing ids at ${id} — reached the frontier, stopping.`);
        break;
      }
      continue;
    }
    consecutive404s = 0;
    scanned++;
    maxIdSeen = Math.max(maxIdSeen, id);

    if (mode.kind === "backfill-year" && new Date(event.date).getUTCFullYear() !== mode.year) {
      continue; // outside the target window — the year-start binary search has some slop, this trims it precisely
    }

    if (scanned % 50 === 0) {
      await writeProgress({ scanned, deepFetched, currentId: id, rangeStartId: startId, rangeEndId: endId, updatedAt: new Date().toISOString() });
      // Keep maxKnownId roughly live so an interrupted run leaves a usable resume point for the
      // *next* run's incremental-mode lookback — without this, meta.json only updates on a clean
      // finish, and a crash mid-backfill would make a later incremental run silently skip the gap.
      // backfilledYears is deliberately left untouched here: a year isn't "done" until the final
      // write below, after the loop actually completes.
      await writeMeta({
        maxKnownId: maxIdSeen,
        backfilledYears: priorMeta?.backfilledYears ?? [],
        lastRunAt: new Date().toISOString(),
      });
    }

    if (!isDeepFetchWorthy(event)) continue;

    const bundle = await deepFetch(id, event);
    await writeCachedBundle(bundle);
    deepFetched++;

    if (deepFetched % 25 === 0) {
      console.log(`omnidex: deep-fetched ${deepFetched} events so far (scanned ${scanned}, at id ${id})`);
    }
  }

  await writeProgress({ scanned, deepFetched, currentId: endId, rangeStartId: startId, rangeEndId: endId, updatedAt: new Date().toISOString() });

  await writeMeta({
    maxKnownId: maxIdSeen,
    backfilledYears: Array.from(
      new Set([...(priorMeta?.backfilledYears ?? []), ...(mode.kind === "backfill-year" ? [mode.year] : [])]),
    ),
    lastRunAt: new Date().toISOString(),
  });

  return { scanned, deepFetched, maxIdSeen };
}
