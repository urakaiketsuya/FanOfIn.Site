import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { OmnidexEventSummary, OmnidexVenueGeocode } from "@gatcg/shared";
import { sleep } from "../lib/http.js";
import { config } from "../config.js";

const CACHE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/geocode.json");
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data/omnidex");

/** Nominatim's usage policy requires an identifying User-Agent, not a browser-spoofing one. */
const USER_AGENT = "gatcg-explorer-pipeline/0.1 (+https://github.com/)";

/** `null` = geocoded, Nominatim had no match for this address — cached too, so a bad/unresolvable address isn't retried every run. */
type GeocodeCacheEntry = { lat: number; lng: number } | null;
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
 * a free-text address, no coordinates. Cached forever by `hostId` in pipeline/.cache/geocode.json
 * since a venue's address doesn't change, so a normal incremental run only geocodes venues seen for
 * the first time. Nominatim's usage policy caps free requests at 1/sec, so this deliberately
 * geocodes one at a time rather than in parallel — see `config.geocodeRequestDelayMs`.
 */
export async function buildVenueGeocodes(events: OmnidexEventSummary[]): Promise<OmnidexVenueGeocode[]> {
  const hosts = new Map<number, string>();
  for (const e of events) {
    if (e.hostId === 0 || !e.hostAddress) continue;
    if (!hosts.has(e.hostId)) hosts.set(e.hostId, e.hostAddress);
  }

  const cache = await loadCache();
  let newlyGeocoded = 0;
  for (const [hostId, address] of hosts) {
    const key = String(hostId);
    if (key in cache) continue;
    try {
      cache[key] = await geocodeOne(address);
    } catch (err) {
      console.error(`geocode: failed for host ${hostId} ("${address}")`, err);
      cache[key] = null;
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
  for (const hostId of hosts.keys()) {
    const entry = cache[String(hostId)];
    if (entry) venues.push({ hostId, lat: entry.lat, lng: entry.lng });
  }
  return venues;
}

export async function writeVenueGeocodes(venues: OmnidexVenueGeocode[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, "venues.json"), JSON.stringify({ generatedAt: new Date().toISOString(), venues }), "utf-8");
}
