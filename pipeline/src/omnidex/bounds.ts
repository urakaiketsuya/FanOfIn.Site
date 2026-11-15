import type { OmnidexEvent } from "@gatcg/shared";
import { sleep } from "../lib/http.js";
import { config } from "../config.js";
import { omnidexApi } from "./api.js";

/**
 * Deleted/private IDs are holes, not an upper bound. Probe a window before treating
 * an ID as beyond the frontier; the old single-ID binary search froze at 67582
 * because 67583 was missing while completed event 68510 already existed.
 * This tolerates gaps of up to 127 IDs; no finite probe can prove there are no
 * arbitrarily distant events without an upstream listing endpoint.
 */
export async function findMaxEventId(
  knownMax = 0,
  getEvent: (id: number) => Promise<OmnidexEvent | null> = omnidexApi.getEvent,
  delayMs = config.crawlRequestDelayMs,
): Promise<number> {
  const probes = new Map<number, boolean>();
  async function existsInWindow(id: number): Promise<boolean> {
    for (let offset = 0; offset < 128; offset++) {
      const candidate = id + offset;
      if (!probes.has(candidate)) {
        probes.set(candidate, (await getEvent(candidate)) !== null);
        await sleep(delayMs);
      }
      if (probes.get(candidate)) return true;
    }
    return false;
  }
  let lo = knownMax;
  let hi = Math.max(1, knownMax + 1);
  while (await existsInWindow(hi)) {
    lo = hi;
    hi *= 2;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (await existsInWindow(mid)) lo = mid;
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
