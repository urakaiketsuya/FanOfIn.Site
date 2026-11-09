/** Read-only source audit. Run: node --import tsx pipeline/scripts/validate-champion-packages.ts */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { CHAMPION_PACKAGE_SETTINGS as S, type ChampionPackagesData } from "@gatcg/shared";
import { buildCardIndex, resolveCard, type CardSignature } from "../src/cards/catalog.js";
import { collectStapleObservations, topChampionCard } from "../src/analysis/cardStaples.js";
import { buildDeckSignature } from "../src/analysis/decklists.js";
import { computeChampionPackages } from "../src/analysis/championPackages.js";
import type { OmnidexEventBundle } from "../src/omnidex/cache.js";

const root = new URL("../../", import.meta.url);
const read = async (path: string) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const catalog = buildCardIndex((await read("data/card-catalog.json") as { cards: CardSignature[] }).cards);
const bundles: OmnidexEventBundle[] = [];
for (const file of (await readdir(new URL("data/omnidex/events/", root))).filter(f => f.endsWith(".json")).sort()) bundles.push(await read(`data/omnidex/events/${file}`));
const { observations, reference } = collectStapleObservations(bundles);
const published: ChampionPackagesData = await read("data/analysis/champion-packages.json");
// Rebuild equality catches missing eligible pools as well as stale source generations.
assert.deepEqual(published, computeChampionPackages(observations, catalog, published.generatedAt,
  reference === null ? null : new Date(reference).toISOString().slice(0, 10)));
const source = observations.filter(o => o.format.toLowerCase() === "standard").map(({ raw, periods }) => {
  const signature = buildDeckSignature(0, { main: raw.main ?? [], material: raw.material ?? [], sideboard: [] }, catalog);
  const copies = new Map<string, number>();
  for (const section of ["main", "material"] as const) for (const line of raw[section] ?? []) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const name = resolveCard(catalog, line.card)?.name ?? line.card.trim();
    const key = JSON.stringify([section, name]);
    copies.set(key, (copies.get(key) ?? 0) + line.quantity);
  }
  return { champion: signature.championName, build: signature.championName ? topChampionCard(signature.materialCards, signature.championName, catalog) : null, recent: periods.includes("90"), copies };
});
const round = (n: number) => Math.round(n * 1e4) / 1e4;
const ids = new Set<string>();
let variants = 0;
for (const pack of published.packages) {
  const id = JSON.stringify([pack.champion, pack.championCard, pack.element ?? null]);
  assert.ok(!ids.has(id), `Duplicate package: ${id}`); ids.add(id);
  if (pack.element) assert.ok(pack.championCard, "Element pools require a specific build");
  const decks = source.filter(d => d.champion === pack.champion && (!pack.championCard || d.build === pack.championCard));
  const recent = decks.filter(d => d.recent);
  assert.equal(pack.decks, decks.length, id);
  assert.equal(pack.recentDecks, recent.length, id);
  assert.ok(decks.length >= S.minDecks);
  assert.equal(pack.basis, recent.length >= S.minRecentDecks ? "recent" : "all");
  assert.ok(pack.core.length >= 2);
  const cardKey = (c: { section: string; name: string }) => JSON.stringify([c.section, c.name]);
  const cards = [...pack.core, ...pack.options];
  assert.equal(new Set(cards.map(cardKey)).size, cards.length);
  for (const c of cards) {
    const resolved = resolveCard(catalog, c.name);
    assert.ok(!resolved?.types.includes("CHAMPION"));
    if (pack.element) assert.ok(resolved?.elements.includes(pack.element), `${id}: ${c.name}`);
    const key = cardKey(c);
    assert.equal(c.allInclusion, round(decks.filter(d => d.copies.has(key)).length / decks.length));
    assert.equal(c.recentInclusion, recent.length ? round(recent.filter(d => d.copies.has(key)).length / recent.length) : null);
    const quantities = new Map<number, number>();
    for (const d of decks) { const n = d.copies.get(key); if (n) quantities.set(n, (quantities.get(n) ?? 0) + 1); }
    assert.equal(c.usualCopies, [...quantities].sort((a,b) => b[1]-a[1] || a[0]-b[0])[0][0]);
  }
  const complete = decks.filter(d => pack.core.every(c => d.copies.has(cardKey(c))));
  assert.equal(pack.completeDecks, complete.length);
  assert.ok(complete.length >= S.minComplete);
  assert.equal(pack.completeRecentDecks, complete.filter(d => d.recent).length);
  const patterns = new Map<string, { copies: number[]; decks: number; recentDecks: number }>();
  for (const d of complete) {
    const copies = pack.core.map(c => d.copies.get(cardKey(c))!);
    const key = copies.join(",");
    const row = patterns.get(key) ?? { copies, decks: 0, recentDecks: 0 };
    row.decks++; if (d.recent) row.recentDecks++;
    patterns.set(key, row);
  }
  assert.deepEqual(pack.variants, [...patterns.values()].sort((a,b) =>
    (pack.basis === "recent" ? b.recentDecks-a.recentDecks : 0) || b.decks-a.decks || a.copies.join().localeCompare(b.copies.join())
  ).slice(0, S.maxVariants));
  variants += pack.variants.length;
}
const elemental = published.packages.filter(p => p.element);
console.log(JSON.stringify({
  throughDate: published.throughDate, packagesVerified: published.packages.length,
  elementPackages: elemental.length, builds: new Set(elemental.map(p => p.championCard)).size,
  champions: new Set(elemental.map(p => p.champion)).size, exactVariantsVerified: variants,
  elements: [...new Set(elemental.map(p => p.element))].sort(),
}, null, 2));
