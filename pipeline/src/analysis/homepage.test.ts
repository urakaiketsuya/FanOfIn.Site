import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildHomepage } from './homepage.js';
import type { ArchetypeTaxonomyData, DeckSightingsData } from '@gatcg/shared';
const read = async (name: string) => JSON.parse(await readFile(new URL(`../../../data/analysis/${name}.json`, import.meta.url), 'utf8'));
test('homepage projection preserves recent deck identities and reviewed family cards without full memberships', async () => {
  const sightings: DeckSightingsData = await read('deck-sightings');
  const taxonomy: ArchetypeTaxonomyData = await read('archetype-taxonomy');
  const result = await buildHomepage(sightings.sightings, taxonomy, new URL('../../../data', import.meta.url).pathname);
  assert.equal(result.decks.length, 3);
  assert.equal(new Set(result.decks.map(d => d.championName)).size, 3);
  assert.equal(result.decks[0].eventDate, sightings.sightings.map(d => d.eventDate).sort().at(-1));
  for (const deck of result.decks) {
    assert.ok(sightings.sightings.some(s => s.deckId === deck.id));
    assert.ok(deck.material.length);
    assert.ok(deck.to.startsWith('/events/') || deck.to.startsWith('/decks/'));
  }
  for (const family of result.families) {
    const source = taxonomy.strategyArchetypes.find(f => f.id === family.id)!;
    assert.equal(source.confidence, 'established');
    assert.deepEqual(family.identityCards, source.identityCards?.slice(0, 3));
  }
  assert.ok(JSON.stringify(result).length < 15000);
});
test('empty publication remains an explicit empty homepage', async () => {
  const taxonomy: ArchetypeTaxonomyData = await read('archetype-taxonomy');
  const result = await buildHomepage([], { ...taxonomy, strategyArchetypes: [] }, '/unused');
  assert.deepEqual(result.decks, []);
  assert.deepEqual(result.families, []);
});

test('homepage rising highlights preserve the published season comparison and sample gates', async () => {
  const { computeChampionTrends } = await import('./championTrends.js');
  const sightings: DeckSightingsData = await read('deck-sightings');
  const taxonomy: ArchetypeTaxonomyData = await read('archetype-taxonomy');
  const result = await buildHomepage(sightings.sightings, taxonomy, new URL('../../../data', import.meta.url).pathname);
  const source = computeChampionTrends(sightings.sightings);
  const expected = source.champions.filter(c => (c.trend === 'rising' || c.trend === 'new') && c.trendDeltaPct! > 0)
    .sort((a, b) => b.trendDeltaPct! - a.trendDeltaPct! || a.championName.localeCompare(b.championName)).slice(0, 2);
  assert.ok(result.risingChampions?.length);
  assert.deepEqual(result.risingChampions?.map(c => c.championName), expected.map(c => c.championName));
  for (const highlight of result.risingChampions!) {
    const champion = expected.find(c => c.championName === highlight.championName)!;
    assert.deepEqual(highlight.previous, champion.seasons.at(-2));
    assert.deepEqual(highlight.current, champion.seasons.at(-1));
    assert.equal(highlight.deltaPct, champion.trendDeltaPct);
  }
  const empty = await buildHomepage([], { ...taxonomy, strategyArchetypes: [] }, '/unused');
  assert.deepEqual(empty.risingChampions, []);
});
