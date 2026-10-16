import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { OmnidexEventSummary, OmnidexVenueGeocode } from "@gatcg/shared";
import { validStoreCoordinates } from "@gatcg/shared";
import { sleep } from "../lib/http.js";
import { config } from "../config.js";

const CACHE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/geocode.json");
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/omnidex");

/** Nominatim's usage policy requires an identifying User-Agent, not a browser-spoofing one. */
const USER_AGENT = "fanofin-store-locator/1.0 (+https://fanofin.site)";

/** `null` = geocoded, Nominatim had no match for this address — cached too, so a bad/unresolvable address isn't retried every run. */
type GeocodeCacheEntry = Omit<OmnidexVenueGeocode, "hostId" | "address"> | null;
type GeocodeCache = Record<string, GeocodeCacheEntry>;

async function loadCache(): Promise<GeocodeCache> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf-8")) as GeocodeCache;
  } catch {
    return {};
  }
}

async function saveCache(cache: GeocodeCache): Promise<void> {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(cache), "utf-8");
}

async function geocodeOne(address: string): Promise<GeocodeCacheEntry> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} geocoding "${address}"`);
  const body = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (body.length === 0) return null;
  return { lat: Number(body[0].lat), lng: Number(body[0].lon) };
}

/**
 * Geocodes each distinct Omnidex venue's free-text address via Nominatim (OpenStreetMap's free
 * geocoder, no API key needed) so venues can be plotted on a real map — `OmnidexHost` only carries
 * a free-text address, no coordinates. Cached by `hostId` and address in pipeline/.cache/geocode.json
 * so moved venues are refreshed and a normal incremental run only geocodes addresses seen for
 * the first time. Nominatim's usage policy caps free requests at 1/sec, so this deliberately
 * geocodes one at a time rather than in parallel — see `config.geocodeRequestDelayMs`.
 */
export async function buildVenueGeocodes(events: OmnidexEventSummary[]): Promise<OmnidexVenueGeocode[]> {
  const hosts = new Map<number, string>();
  for (const e of [...events].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)) {
    if (e.hostId === 0 || e.setting !== "physical" || !e.hostAddress) continue;
    if (!hosts.has(e.hostId)) hosts.set(e.hostId, e.hostAddress);
  }

  const cache = await loadCache();
  // Reviewed imports remain address-bound and survive subsequent crawler runs.
  const imported = JSON.parse(await readFile(path.join(DATA_DIR, "../curated/store-geocodes.json"), "utf-8")) as OmnidexVenueGeocode[];
  for (const point of imported) {
    if (!point.address || !point.sourceUrl || !validStoreCoordinates(point)) continue;
    const { hostId, address, ...entry } = point;
    cache[JSON.stringify([hostId, address])] = entry;
  }
  let newlyGeocoded = 0;
  for (const [hostId, address] of hosts) {
    const key = JSON.stringify([hostId, address]);
    if (key in cache) continue;
    try {
      cache[key] = await geocodeOne(address);
    } catch (err) {
      console.error(`geocode: failed for host ${hostId} ("${address}")`, err);
      await sleep(config.geocodeRequestDelayMs);
      continue;
    }
    newlyGeocoded++;
    // Saved after every venue, not batched at the end — a run geocoding hundreds of venues at
    // 1/sec can take minutes, and an interruption (CI timeout, crash) shouldn't lose progress
    // already paid for against Nominatim's rate limit.
    await saveCache(cache);
    await sleep(config.geocodeRequestDelayMs);
  }
  if (newlyGeocoded > 0) console.log(`geocode: resolved ${newlyGeocoded} newly-seen venue(s)`);

  const venues: OmnidexVenueGeocode[] = [];
  for (const [hostId, address] of hosts) {
    const entry = cache[JSON.stringify([hostId, address])];
    if (entry) venues.push({ hostId, address, ...entry });
  }
  return venues;
}

export async function writeVenueGeocodes(venues: OmnidexVenueGeocode[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "venues.json"), JSON.stringify({ generatedAt: new Date().toISOString(), venues }), "utf-8");
}
