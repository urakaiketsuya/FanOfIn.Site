import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { decodeCardLines, type ArchetypeTaxonomyData, type DeckCardIndexData, type DeckSightingsData } from "@gatcg/shared";
import { buildDeckSignature } from "../src/analysis/decklists.js";
import { buildCardIndex } from "../src/cards/catalog.js";
import { isArchetypeStrategyCard, materialRouteName } from "../src/analysis/archetypeTaxonomy.js";
import { analyzeEngines, type EngineDeck } from "../src/analysis/sharedEngines.js";
const root = new URL("../../", import.meta.url);
const read = async (file: string) => JSON.parse(await readFile(new URL(file, root), "utf8"));
const previous: ArchetypeTaxonomyData = await read("data/analysis/archetype-taxonomy.json");
const snapshot = structuredClone(previous);
const cardIndex = buildCardIndex((await read("pipeline/.cache/cards.json")).cards);
const sightings: DeckSightingsData = await read("data/analysis/deck-sightings.json");
const index: DeckCardIndexData = await read("data/analysis/deck-card-index.json");
const byId = new Map(sightings.sightings.map((s) => [s.deckId, s]));
const events = new Map<number, { format: string }>((await read("data/omnidex/index.json")).events.map((event: { id: number; format: string }) => [event.id, event]));
const decks: EngineDeck[] = index.decks.flatMap((deck) => {
  const [eventId, player] = deck.deckId.split(":").map(Number);
  const lines = (section: typeof deck.main) => decodeCardLines(section, index.cardNames).map((line) => ({ card: line.name, quantity: line.quantity }));
  const championName = buildDeckSignature(player, { main: lines(deck.main), material: lines(deck.material), sideboard: [] }, cardIndex).championName;
  if (!championName) return [];
  const sighting = byId.get(deck.deckId) ?? { eventId, player, championName, format: events.get(eventId)?.format ?? "unknown" };
  const material = decodeCardLines(deck.material, index.cardNames).map((line) => ({ ...line, card: cardIndex.get(line.name) }));
  const identity = material.filter(({ card }) => !isArchetypeStrategyCard(card));
  return [{ deckId: deck.deckId, player: sighting.player, eventId: sighting.eventId, championName: sighting.championName,
    format: sighting.format, access: [...new Set(identity.flatMap(({ card }) => card?.elements ?? []).filter((e) => e !== "NORM"))].sort().join("|"),
    materialRouteName: materialRouteName(material, sighting.championName),
    cardCounts: new Map(decodeCardLines([...deck.main, ...deck.material], index.cardNames).filter((line) => isArchetypeStrategyCard(cardIndex.get(line.name))).map((line) => [line.name, line.quantity])) }];
});
const observed = new Set(decks.map((d) => d.deckId));
assert.ok(previous.clusters.every((c) => c.deckIds.every((id) => observed.has(id))), "Published index must cover every existing member");
const engines = analyzeEngines(previous.clusters, decks);
previous.engineArchetypes = [];
previous.historicalEngineArchetypes = [];
for (const engine of engines) {
  const bannedCards = engine.definingCards.filter((c) => cardIndex.get(c.name)?.legality?.STANDARD?.limit === 0).map((c) => c.name);
  if (bannedCards.length) previous.historicalEngineArchetypes.push({ ...engine, bannedCards });
  else previous.engineArchetypes.push(engine);
}
const records = (data: ArchetypeTaxonomyData) => data.clusters.map(({ name: _name, ...record }) => record);
assert.deepEqual(records(previous), records(snapshot));
assert.deepEqual(previous.aliases, snapshot.aliases);
previous.generatedAt = new Date().toISOString();
await writeFile(new URL("data/analysis/archetype-taxonomy.json", root), JSON.stringify(previous));
const manifest = await read("data/manifest.json");
manifest["analysis-archetype-taxonomy"] = previous.generatedAt;
await writeFile(new URL("data/manifest.json", root), JSON.stringify(manifest));
console.log(`Preserved all fields except labels for ${previous.clusters.length} builds and all lineage aliases.`);
console.log(engines.reduce((counts, engine) => ({ ...counts, [engine.status!]: (counts[engine.status!] ?? 0) + 1 }), {} as Record<string, number>));
