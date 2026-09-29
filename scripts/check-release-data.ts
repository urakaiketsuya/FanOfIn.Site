import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MANIFEST_ENTRIES } from '../pipeline/src/manifest.js';
import type { ArchetypeCluster, DeckCardIndexData, ReferenceAnalysis } from '@gatcg/shared';
const root = new URL('../data/', import.meta.url);
const read = async (file: string) => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const manifest = await read('manifest.json');
for (const { key, file } of MANIFEST_ENTRIES) {
  const artifact = await read(file);
  assert.equal(manifest[key], artifact.generatedAt, `Manifest generation mismatch: ${key}`);
  assert.ok(Number.isFinite(Date.parse(artifact.generatedAt)), `Invalid generation: ${key}`);
}
const index: DeckCardIndexData = await read('analysis/deck-card-index.json');
const decks = new Set(index.decks.map(deck => deck.deckId));
const taxonomy = await read('analysis/archetype-taxonomy.json');
const builds = new Map<string, ArchetypeCluster>(taxonomy.clusters.map((build: ArchetypeCluster) => [build.id, build]));
assert.equal(builds.size, taxonomy.clusters.length, 'Duplicate concrete build IDs');
for (const build of builds.values()) {
  assert.equal(new Set(build.deckIds).size, build.deckIds.length, `Duplicate build membership: ${build.id}`);
  assert.equal(build.deckCount, build.deckIds.length, `Incorrect build count: ${build.id}`);
  for (const id of build.deckIds) assert.ok(decks.has(id), `Missing build deck: ${id}`);
}
for (const name of ['reference-archetypes', 'curated-strategies']) {
  const raw = await readFile(new URL(`analysis/${name}.json`, root), 'utf8');
  const data: ReferenceAnalysis = JSON.parse(raw);
  assert.ok(raw.slice(0, 200).includes(data.generatedAt), `${name}: manifest reader needs generatedAt in first 200 bytes`);
  assert.equal(data.population, decks.size, `${name}: stale deck population`);
  assert.equal(new Set(data.definitions.map(d => d.id)).size, data.definitions.length, `${name}: duplicate definitions`);
  assert.equal(data.evidence.length, data.definitions.length, `${name}: missing evidence`);
  for (const evidence of data.evidence) {
    assert.ok(data.definitions.some(d => d.id === evidence.id), `${name}: unknown evidence definition`);
    const members = new Set(evidence.deckIds);
    assert.equal(members.size, evidence.deckIds.length, `${name}: duplicate membership`);
    for (const id of members) assert.ok(decks.has(id), `${name}: missing deck ${id}`);
    for (const overlap of evidence.builds) {
      const build = builds.get(overlap.id);
      assert.ok(build, `Missing concrete build ${overlap.id}`);
      assert.equal(overlap.total, build.deckIds.length, `Stale build size ${overlap.id}`);
      assert.equal(overlap.matched, build.deckIds.filter(id => members.has(id)).length, `Incorrect intersection ${overlap.id}`);
    }
  }
}
console.log(`Published artifacts verified: ${builds.size} concrete builds, ${decks.size} unique decks.`);
