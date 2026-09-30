import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Card, CardTagDefinition, CardTagStatus, CardTagsData } from "@gatcg/shared";
import { loadCardCatalog } from "../cards/catalog.js";
import { fetchJson, sleep } from "../lib/http.js";
import { writeJsonAtomic } from "../lib/atomicWrite.js";

const BASE_URL = "https://silvie.gg/api/tagger";
const SOURCE_URL = "https://silvie.gg/tagger";
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../data");
const OUTPUT_PATH = path.join(DATA_DIR, "community/card-tags.json");

/** Only the fields we keep — silvie.gg's rows also carry the tagger's `userId`, votes, and full card
 * text, all deliberately dropped here (no user identity; card text comes from our own catalog). */
export interface SilvieCardRow {
  /** `${cardUuid}-${editionUuid}` — the same uuids api.gatcg.com uses. */
  id: string;
  editionId: string;
  tagger_cardtag: { tagId: string }[];
}

export interface SilvieTagRow {
  name: string;
  status: string;
}

const STATUSES = new Set<CardTagStatus>(["approved", "pending", "review"]);

export function buildCardTags(
  rows: SilvieCardRow[],
  tagRows: SilvieTagRow[],
  catalog: Pick<Card, "uuid" | "editions">[],
  generatedAt = new Date().toISOString(),
): CardTagsData {
  const editionToCard = new Map(catalog.flatMap((card) => card.editions.map((ed) => [ed.uuid, card.uuid] as const)));
  const cardUuids = new Set(catalog.map((card) => card.uuid));
  const statusByName = new Map(tagRows.map((t) => [t.name, t.status]));

  const byEdition = new Map<string, Set<string>>();
  const byCard = new Map<string, Set<string>>();
  for (const row of rows) {
    const names = row.tagger_cardtag.map((t) => t.tagId.trim()).filter(Boolean);
    if (!names.length) continue;
    // A handful of printings silvie.gg knows about aren't in our catalog (yet); fall back to the
    // card uuid prefix of `id` so the card-level tag still lands when the card itself exists.
    const cardUuid = editionToCard.get(row.editionId) ?? row.id.slice(0, row.id.length - row.editionId.length - 1);
    if (!cardUuids.has(cardUuid)) continue;
    const cardSet = byCard.get(cardUuid) ?? new Set();
    names.forEach((n) => cardSet.add(n));
    byCard.set(cardUuid, cardSet);
    if (editionToCard.has(row.editionId)) {
      const edSet = byEdition.get(row.editionId) ?? new Set();
      names.forEach((n) => edSet.add(n));
      byEdition.set(row.editionId, edSet);
    }
  }

  const counts = new Map<string, number>();
  for (const names of byCard.values()) for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  const tags: CardTagDefinition[] = [...counts]
    .map(([name, cardCount]) => {
      const status = statusByName.get(name);
      return { name, cardCount, status: STATUSES.has(status as CardTagStatus) ? (status as CardTagStatus) : "pending" };
    })
    .sort((a, b) => b.cardCount - a.cardCount || a.name.localeCompare(b.name));
  const index = new Map(tags.map((t, i) => [t.name, i]));
  const encode = (m: Map<string, Set<string>>) =>
    Object.fromEntries([...m].map(([k, names]) => [k, [...names].map((n) => index.get(n)!).sort((a, b) => a - b)]));

  return { generatedAt, source: "silvie.gg", sourceUrl: SOURCE_URL, tags, editions: encode(byEdition), cards: encode(byCard) };
}

/** Two requests total: the tag list, then every card row (an empty `query` returns the whole catalog). */
export async function publishCardTags(): Promise<void> {
  await loadCardCatalog(); // refreshes data/card-catalog.json when stale
  const { cards: catalog } = JSON.parse(await readFile(path.join(DATA_DIR, "card-catalog.json"), "utf-8")) as { cards: Card[] };
  const tagRows = await fetchJson<SilvieTagRow[]>(`${BASE_URL}/tags/popular`);
  await sleep(1000);
  const rows = await fetchJson<SilvieCardRow[]>(`${BASE_URL}/cards?query=`);
  if (!Array.isArray(rows) || rows.length < 1000) throw new Error(`silvie.gg returned ${Array.isArray(rows) ? rows.length : "no"} card rows — refusing to overwrite card-tags.json`);

  const data = buildCardTags(rows, tagRows, catalog);
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeJsonAtomic(path.join(DATA_DIR, "community/card-tag-targets.json"), { generatedAt: data.generatedAt, cards: catalog.map(card => ({ uuid: card.uuid, editions: card.editions.map(edition => ({ uuid: edition.uuid })) })) });
  await writeJsonAtomic(OUTPUT_PATH, data);
  console.log(`silvie tags: ${data.tags.length} tags across ${Object.keys(data.cards).length} cards / ${Object.keys(data.editions).length} printings`);
}
