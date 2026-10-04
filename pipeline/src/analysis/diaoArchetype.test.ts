import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiaoArchetypeEvidence, diaoPackageEvidence, DIAO_BURN_CORE, DIAO_REBUKE_COMBO, DIAO_IDENTITIES, type DiaoPackageEvidence, type ArchetypeTaxonomyData } from '@gatcg/shared';
import { readFileSync } from 'node:fs';

test('joint evidence requires positive copies of every core card and deduplicates appearances', () => {
  const cards = new Map([['burn', new Map(DIAO_BURN_CORE.map(name => [name, 2]))], ['combo', new Map(DIAO_REBUKE_COMBO.map(name => [name, 3]))], ['zero', new Map(DIAO_BURN_CORE.map(name => [name, 0]))]]);
  const result = diaoPackageEvidence(['burn', 'burn', 'combo', 'zero', 'missing'], cards);
  assert.equal(result.coreDeckCount, 1);
  assert.equal(result.comboDeckCount, 1);
  assert.equal(result.evaluatedDeckCount, 3);
  assert.equal(result.missingDeckCount, 1);
  assert.equal(result.cards.find(card => card.name === 'Firebloom Flourish')?.averageCopies, 5 / 3);
});

test('published Diao fixture preserves all membership and requires complete evidence before naming', () => {
  const taxonomy: ArchetypeTaxonomyData = JSON.parse(readFileSync(new URL('../../../data/analysis/archetype-taxonomy.json', import.meta.url), 'utf8'));
  const original = JSON.stringify(taxonomy.clusters);
  const family = taxonomy.strategyArchetypes.find(strategy => strategy.id === 'kqcisi')!;
  assert.ok(family);
  family.name = 'Original';
  delete family.diaoPackageEvidence;
  const ids = taxonomy.clusters.filter(build => family.buildIds.includes(build.id)).flatMap(build => build.deckIds);
  const cards = new Map(ids.map(id => [id, new Map(DIAO_BURN_CORE.map(name => [name, 1]))]));
  cards.delete(ids[0]);
  applyDiaoArchetypeEvidence(taxonomy.strategyArchetypes, taxonomy.clusters, cards);
  assert.equal(family.name, 'Original');
  cards.set(ids[0], new Map(DIAO_BURN_CORE.map(name => [name, 1])));
  applyDiaoArchetypeEvidence(taxonomy.strategyArchetypes, taxonomy.clusters, cards);
  assert.equal(family.name, 'Diao Chan — Phantasia Burn');
  assert.equal(JSON.stringify(taxonomy.clusters), original);
});

test('pipeline checks Diao main/material jointly and never counts a sideboard combo', async () => {
  const { taxonomyScenario } = await import('./fixtures/taxonomyScenario.js');
  const { computeArchetypeTaxonomy } = await import('./archetypeTaxonomy.js');
  const fixture = taxonomyScenario();
  const signatures = fixture.ctx.getEventSignatures;
  fixture.ctx.getEventSignatures = bundle => new Map([...signatures(bundle)].map(([player, signature]) => [player, { ...signature, championName: 'Diao Chan' }]));
  for (const bundle of fixture.bundles) if (Array.isArray(bundle.decklists)) for (const entry of bundle.decklists) {
    entry.decklist.main.push(...DIAO_BURN_CORE.slice(0, 2).map(card => ({ card, quantity: 4 })));
    entry.decklist.material.push({ card: DIAO_BURN_CORE[2], quantity: 1 });
    entry.decklist.sideboard = [{ card: 'Searing Rebuke', quantity: 4 }];
  }
  const taxonomy = computeArchetypeTaxonomy(fixture.bundles, fixture.ctx, fixture.sightings, fixture.prices);
  assert.ok(taxonomy.strategyArchetypes.length > 0);
  for (const family of taxonomy.strategyArchetypes) {
    assert.equal(family.name, 'Diao Chan — Phantasia Burn');
    assert.equal(family.diaoPackageEvidence?.coreDeckCount, family.deckCount);
    assert.equal(family.diaoPackageEvidence?.comboDeckCount, 0);
  }
});

test('reviewed cores qualify independently, retain confidence, and clear stale or ambiguous identities', () => {
  const taxonomy: ArchetypeTaxonomyData = JSON.parse(readFileSync(new URL('../../../data/analysis/archetype-taxonomy.json', import.meta.url), 'utf8'));
  for (const identity of DIAO_IDENTITIES) {
    const family = structuredClone(taxonomy.strategyArchetypes.find(strategy => strategy.championName === 'Diao Chan')!);
    family.name = 'Original';
    family.confidence = 'emerging';
    delete family.diaoPackageEvidence;
    const builds = taxonomy.clusters.filter(build => family.buildIds.includes(build.id));
    const ids = [...new Set(builds.flatMap(build => build.deckIds))];
    const cards = new Map(ids.map(id => [id, new Map(identity.core.map(name => [name, 4]))]));
    applyDiaoArchetypeEvidence([family], builds, cards);
    assert.equal(family.name, identity.name);
    assert.equal(family.confidence, 'emerging');
    assert.equal((family.diaoPackageEvidence as DiaoPackageEvidence | undefined)?.identityDeckCount, ids.length);
    assert.deepEqual(family.identityCards, identity.core);
    cards.delete(ids[0]);
    applyDiaoArchetypeEvidence([family], builds, cards);
    assert.equal(family.name, 'Original');
    assert.equal(family.identityCards, undefined);
    assert.equal((family.diaoPackageEvidence as DiaoPackageEvidence | undefined)?.identityKey, undefined);
    const allCores = DIAO_IDENTITIES.flatMap(entry => entry.core);
    for (const id of ids) cards.set(id, new Map(allCores.map(name => [name, 4])));
    applyDiaoArchetypeEvidence([family], builds, cards);
    assert.equal(family.name, 'Original');
  }
});
