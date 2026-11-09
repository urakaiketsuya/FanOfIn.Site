/** Read-only validation of the first champion/element package against published event lists.
 * Run: node --import tsx pipeline/scripts/validate-jin-exia.ts
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { findStapleCohort, type CardStaplesData, type ChampionPackagesData } from "@gatcg/shared";
import { buildCardIndex, resolveCard, type CardSignature } from "../src/cards/catalog.js";
import { collectStapleObservations, topChampionCard } from "../src/analysis/cardStaples.js";
import { buildDeckSignature } from "../src/analysis/decklists.js";
import type { OmnidexEventBundle } from "../src/omnidex/cache.js";

const root = new URL("../../", import.meta.url);
const read = async (path: string) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const catalog = buildCardIndex((await read("data/card-catalog.json") as { cards: CardSignature[] }).cards);
const bundles: OmnidexEventBundle[] = [];
for (const file of (await readdir(new URL("data/omnidex/events/", root))).filter(f => f.endsWith(".json")).sort()) bundles.push(await read(`data/omnidex/events/${file}`));
const { observations, reference } = collectStapleObservations(bundles);
const championCard = "Jin, Undying Resolve";
assert.equal(resolveCard(catalog, championCard)?.level, 3);
assert.ok(resolveCard(catalog, championCard)?.elements.includes("EXIA"));
const decks = observations.filter(({ raw, format }) => {
  if (format !== "standard") return false;
  const signature = buildDeckSignature(0, { main: raw.main ?? [], material: raw.material ?? [], sideboard: [] }, catalog);
  return signature.championName === "Jin" && topChampionCard(signature.materialCards, "Jin", catalog) === championCard;
}).map(({ raw, periods }) => {
  const copies = new Map<string, number>();
  for (const section of ["main", "material"] as const) for (const line of raw[section] ?? []) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    const name = resolveCard(catalog, line.card)?.name ?? line.card.trim();
    const key = `${section}:${name}`;
    copies.set(key, (copies.get(key) ?? 0) + line.quantity);
  }
  return { copies, recent: periods.includes("90") };
});
const staples: CardStaplesData = await read("data/analysis/card-staples.json");
assert.equal(findStapleCohort(staples, "all", "standard", "Jin", championCard)?.decks, decks.length, "Published staples must match source build population");
const packages: ChampionPackagesData = await read("data/analysis/champion-packages.json");
const published = packages.packages.find(p => p.championCard === championCard && !p.element)!;
assert.ok(published, "Jin build package exists");
assert.equal(published.decks, decks.length);
const completePublished = decks.filter(d => published.core.every(c => d.copies.has(`${c.section}:${c.name}`)));
assert.equal(published.completeDecks, completePublished.length);
assert.equal(published.completeRecentDecks, completePublished.filter(d => d.recent).length);
for (const variant of published.variants) {
  const matching = completePublished.filter(d => published.core.every((c, i) => d.copies.get(`${c.section}:${c.name}`) === variant.copies[i]));
  assert.equal(variant.decks, matching.length);
  assert.equal(variant.recentDecks, matching.filter(d => d.recent).length);
}
const elemental = packages.packages.find(p => p.championCard === championCard && p.element === "EXIA");
assert.ok(elemental, "Published Jin Exia package exists");
assert.equal(elemental.decks, decks.length);
for (const c of [...elemental.core, ...elemental.options]) assert.ok(resolveCard(catalog, c.name)?.elements.includes("EXIA"));
const elementalComplete = decks.filter(d => elemental.core.every(c => d.copies.has(`${c.section}:${c.name}`)));
assert.equal(elemental.completeDecks, elementalComplete.length);
assert.equal(elemental.completeRecentDecks, elementalComplete.filter(d => d.recent).length);
for (const variant of elemental.variants) {
  const matching = elementalComplete.filter(d => elemental.core.every((c, i) => d.copies.get(`${c.section}:${c.name}`) === variant.copies[i]));
  assert.equal(variant.decks, matching.length);
  assert.equal(variant.recentDecks, matching.filter(d => d.recent).length);
}
const core = [
  { section: "main", name: "Seething Intercession" },
  { section: "material", name: "Berserker Plate" },
  { section: "main", name: "Mend Flesh" },
  { section: "main", name: "Enrage" },
];
for (const card of core) assert.ok(resolveCard(catalog, card.name)?.elements.includes("EXIA"));
const key = (c: { section: string; name: string }) => `${c.section}:${c.name}`;
const complete = decks.filter(d => core.every(c => d.copies.has(key(c))));
assert.ok(complete.length >= 25, "Starter core needs at least 25 complete observations");
const patterns = new Map<string, { copies: number[]; decks: number; recentDecks: number }>();
for (const d of complete) {
  const copies = core.map(c => d.copies.get(key(c))!);
  const id = JSON.stringify(copies), row = patterns.get(id) ?? { copies, decks: 0, recentDecks: 0 };
  row.decks++; if (d.recent) row.recentDecks++; patterns.set(id, row);
}
console.log(JSON.stringify({
  throughDate: new Date(reference!).toISOString().slice(0, 10), championCard, format: "standard", element: "EXIA",
  scope: "Tournament event/player observations; highest champion card; Main + Material; no Sideboard",
  decks: decks.length, recentDecks: decks.filter(d => d.recent).length,
  core: core.map(c => ({ ...c, decks: decks.filter(d => d.copies.has(key(c))).length, recentDecks: decks.filter(d => d.recent && d.copies.has(key(c))).length })),
  completeDecks: complete.length, completeRecentDecks: complete.filter(d => d.recent).length,
  variants: [...patterns.values()].sort((a, b) => b.recentDecks - a.recentDecks || b.decks - a.decks || JSON.stringify(a.copies).localeCompare(JSON.stringify(b.copies))).slice(0, 5),
  publishedBuildPackage: { coreCards: published.core.length, completeDecks: completePublished.length, exactVariantsVerified: published.variants.length },
}, null, 2));
