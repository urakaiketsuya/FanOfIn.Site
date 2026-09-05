import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CardLegality, CardSearchResponse } from "@gatcg/shared";
import { fetchJson, sleep } from "../lib/http.js";

const BASE_URL = "https://api.gatcg.com";
const CACHE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.cache/cards.json");
const REQUEST_DELAY_MS = 150;
/** Re-fetch the catalog if our cached copy is older than this — cards change slowly, decklists need this fast. */
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

export interface CardSignature {
  name: string;
  slug: string;
  classes: string[];
  types: string[];
  subtypes: string[];
  elements: string[];
  /** Champion level (1-3 for named upgrade printings, 0 for Spirits, null for non-Champions) — used to identify a deck's "true" Champion by its highest-level printing in the material deck. */
  level: number | null;
  cost_memory?: number | null;
  cost_reserve?: number | null;
  power?: number | null;
  speed?: boolean | null;
  /** Raw rules text (markdown-bolded keywords) — needed for `computeKeywordComposition` in @gatcg/shared. */
  effect: string | null;
  /** Keyed by format (e.g. "STANDARD", "PANTHEON"); a format's `limit: 0` means banned in that format. Optional/absent on a stale on-disk cache from before this field shipped or a synthetic test fixture — always read with optional chaining. Used to keep currently-unplayable (banned-card) archetypes out of the live taxonomy — see archetypeTaxonomy.ts's historical-archetype split. */
  legality?: CardLegality | null;
  /**
   * Set prefix + collector number per printing — the precise join key into data/prices.json's
   * priceKey(), instead of matching TCGPlayer's own product name string (see loadPriceByName in
   * analysis/build.ts). `releaseDate` (the set's `release_date`, ISO-ish date string from the raw
   * API — same source, just not dropped) is what lets a card's *earliest* printing stand in for
   * "when this card first became legal," used by the ShoutAtYourDecks era-inference stat (see
   * docs/CALCULATIONS.md) to lower-bound a deck's age from its newest-required card. May be
   * absent (not just empty) on a stale on-disk cache from before a given field shipped — always
   * read with `?? []`/optional chaining, self-heals within the existing 24h cache TTL.
   */
  editions: { setPrefix: string; collectorNumber: string; releaseDate: string }[];
}

interface CardCatalogCache {
  fetchedAt: string;
  cards: CardSignature[];
}

async function fetchFullCatalog(): Promise<CardSignature[]> {
  const cards: CardSignature[] = [];
  let page = 1;
  for (;;) {
    const res = await fetchJson<CardSearchResponse>(`${BASE_URL}/cards/search?page=${page}&page_size=50&sort=name&order=ASC`);
    for (const card of res.data) {
      cards.push({
        name: card.name,
        slug: card.slug,
        classes: card.classes,
        types: card.types,
        subtypes: card.subtypes,
        elements: card.elements,
        level: card.level,
        cost_memory: card.cost_memory,
        cost_reserve: card.cost_reserve,
        power: card.power,
        speed: card.speed,
        effect: card.effect,
        legality: card.legality,
        editions: card.editions.map((e) => ({ setPrefix: e.set.prefix, collectorNumber: e.collector_number, releaseDate: e.set.release_date })),
      });
    }
    if (!res.has_more) break;
    page++;
    await sleep(REQUEST_DELAY_MS);
  }
  return cards;
}

/** Cached to disk so analysis runs don't re-fetch the ~50-request full catalog every time. */
export async function loadCardCatalog(): Promise<CardSignature[]> {
  try {
    const cached = JSON.parse(await readFile(CACHE_PATH, "utf-8")) as CardCatalogCache;
    if (cached.cards[0]?.cost_memory !== undefined && cached.cards[0]?.legality !== undefined && Date.now() - new Date(cached.fetchedAt).getTime() < MAX_CACHE_AGE_MS) {
      return cached.cards;
    }
  } catch {
    // no cache yet
  }

  const cards = await fetchFullCatalog();
  await mkdir(path.dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), cards } satisfies CardCatalogCache), "utf-8");
  return cards;
}

export function buildCardIndex(cards: CardSignature[]): Map<string, CardSignature> {
  const index = new Map<string, CardSignature>();
  for (const card of cards) index.set(card.name, card);
  return index;
}

/**
 * Keyed by `slug` — confirmed live against the real sleeved.gg API that a deck's `cardId` field
 * (e.g. "spirit-of-fire") is the card's slug, not its `cardNumber`/set-collector-number join key
 * (an earlier assumption, corrected before writing pipeline/src/sleeved/transform.ts, which is
 * this index's only consumer). Slugs are per-card, not per-printing, so unlike a cardNumber index
 * there's no printing ambiguity to resolve.
 */
export function buildSlugIndex(cards: CardSignature[]): Map<string, CardSignature> {
  const index = new Map<string, CardSignature>();
  for (const card of cards) index.set(card.slug, card);
  return index;
}

/** Case/quote-folded form of a card name, for matching a raw decklist string against the catalog when the exact string doesn't match — real decklist submissions occasionally use non-canonical casing ("dungeon guide") or a straight apostrophe where the catalog has a curly one. Not used as `cardIndex`'s own keys (those stay canonical/exact — see `resolveCard`), only as the fallback lookup. */
export function normalizeCardKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .trim()
    .toLowerCase();
}

/** One folded index per `cardIndex` instance, built lazily and reused — `cardIndex` is built once per pipeline run, so this pays the ~2,400-card fold cost once rather than per decklist line. */
const foldedIndexCache = new WeakMap<Map<string, CardSignature>, Map<string, CardSignature>>();
function getFoldedIndex(cardIndex: Map<string, CardSignature>): Map<string, CardSignature> {
  let folded = foldedIndexCache.get(cardIndex);
  if (!folded) {
    folded = new Map();
    for (const card of cardIndex.values()) folded.set(normalizeCardKey(card.name), card);
    foldedIndexCache.set(cardIndex, folded);
  }
  return folded;
}

/**
 * Resolves a raw, possibly-mistyped decklist card name to its `CardSignature` — exact match first
 * (the overwhelming common case), falling back to a case/quote-folded match. Returns `undefined`
 * only when genuinely not in the catalog even after folding, same as a plain `cardIndex.get()`
 * miss today — a truly unrecognized card is still tracked under its own raw text by callers, not
 * silently dropped.
 */
export function resolveCard(cardIndex: Map<string, CardSignature>, raw: string): CardSignature | undefined {
  return cardIndex.get(raw) ?? getFoldedIndex(cardIndex).get(normalizeCardKey(raw));
}
