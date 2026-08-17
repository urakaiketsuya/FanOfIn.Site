import { sleep } from "../lib/http.js";
import { config } from "../config.js";
import { omnidexApi } from "./api.js";

/**
 * Omnidex has no bulk-listing endpoint, so the crawler has to know its own search space.
 * IDs are assigned sequentially with no gaps near the frontier (verified against live
 * data — dense from at least id 60725-60729 as of writing), so exponential probe + binary
 * search reliably finds the current max ID in ~30-40 requests regardless of how large it's grown.
 */
export async function findMaxEventId(): Promise<number> {
  let lo = 1;
  let hi = 1;
  while ((await omnidexApi.getEvent(hi)) !== null) {
    lo = hi;
    hi *= 2;
    await sleep(config.crawlRequestDelayMs);
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const exists = (await omnidexApi.getEvent(mid)) !== null;
    await sleep(config.crawlRequestDelayMs);
    if (exists) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Approximates the event ID where a given year's events begin, via binary search on `date`.
 * Assumes dates are roughly monotonic with ID (true in practice, though not perfectly — a
 * missing/deleted ID at the midpoint just nudges the search rather than aborting it), and
 * pads the result with `yearBoundarySafetyMargin` since the crawler re-checks each event's
 * actual date anyway — this only needs to get close, not exact.
 */
export async function findYearStartId(year: number, maxId: number): Promise<number> {
  const target = `${year}-01-01T00:00:00.000Z`;
  let lo = 1;
  let hi = maxId;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const event = await omnidexApi.getEvent(mid);
    await sleep(config.crawlRequestDelayMs);
    if (!event) {
      lo = mid;
      continue;
    }
    if (event.date < target) lo = mid;
    else hi = mid;
  }
  return Math.max(1, lo - config.yearBoundarySafetyMargin);
}
