import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { CardSearchResponse } from "@gatcg/shared";
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
      cards.push({ name: card.name, slug: card.slug, classes: card.classes, types: card.types, subtypes: card.subtypes, elements: card.elements });
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
    if (Date.now() - new Date(cached.fetchedAt).getTime() < MAX_CACHE_AGE_MS) {
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
