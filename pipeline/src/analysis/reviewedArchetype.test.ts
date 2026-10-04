import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyReviewedArchetypeEvidence, decodeCardLines, REVIEWED_ARCHETYPE_CORES, type ArchetypeTaxonomyData, type DeckCardIndexData } from '@gatcg/shared';
const taxonomy: ArchetypeTaxonomyData = JSON.parse(readFileSync(new URL('../../../data/analysis/archetype-taxonomy.json', import.meta.url), 'utf8'));
const index: DeckCardIndexData = JSON.parse(readFileSync(new URL('../../../data/analysis/deck-card-index.json', import.meta.url), 'utf8'));
const cards = new Map(index.decks.map(deck => [deck.deckId, new Map(decodeCardLines([...deck.main, ...deck.material], index.cardNames).filter(c => c.quantity > 0).map(c => [c.name, c.quantity]))]));
test('published families retain all memberships and stats, and refresh is idempotent', () => {
  const copy = structuredClone(taxonomy);
  applyReviewedArchetypeEvidence(copy.strategyArchetypes, copy.clusters, cards);
  assert.deepEqual(copy, taxonomy);
  for (const identity of REVIEWED_ARCHETYPE_CORES) assert.equal(copy.strategyArchetypes.filter(s => s.name === identity.name).length, ['Silvie', 'Guo Jia'].includes(identity.champion) ? 3 : identity.champion === 'Zander' ? (identity.name.includes('Water') ? 3 : 2) : identity.champion === 'Rai' ? 2 : identity.champion === 'Tristan' && identity.name.startsWith('Wind') ? 2 : 1);
});
test('missing data, ambiguous cores and insufficient recurrence restore generated label', () => {
  for (const mode of ['missing', 'ambiguous', 'players', 'events', 'build', 'zero']) {
    const strategy = structuredClone(taxonomy.strategyArchetypes.find(s => s.name === REVIEWED_ARCHETYPE_CORES.find(c => c.champion === 'Lorraine')!.name)!);
    const original = strategy.reviewedArchetypeEvidence!.originalName;
    const ids = taxonomy.clusters.filter(c => strategy.buildIds.includes(c.id)).flatMap(c => c.deckIds);
    const changed = new Map(cards);
    if (mode === 'missing') changed.delete(ids[0]);
    if (mode === 'ambiguous' || mode === 'zero') for (const id of ids) {
      const counts = new Map(changed.get(id));
      for (const identity of REVIEWED_ARCHETYPE_CORES.filter(c => c.champion === 'Lorraine')) for (const name of identity.core) counts.set(name, mode === 'zero' ? 0 : 1);
      changed.set(id, counts);
    }
    if (mode === 'players') strategy.playerCount = 4;
    if (mode === 'events') strategy.eventCount = 1;
    if (mode === 'build') strategy.buildIds.push('missing-build');
    applyReviewedArchetypeEvidence([strategy], taxonomy.clusters, changed);
    assert.equal(strategy.name, original, mode);
    assert.equal(strategy.identityCards, undefined, mode);
    assert.equal(strategy.reviewedArchetypeEvidence, undefined, mode);
  }
});

test('Slime identity spans three preserved families while Water package remains optional', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Silvie' && s.reviewedArchetypeEvidence));
  assert.equal(families.length, 3);
  assert.equal(families.flatMap(s => s.buildIds).length, 10);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [3112, 91, 45]);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.waterPackageDeckCount), [0, 0, 42]);
  const water = families.find(s => s.deckCount === 45)!;
  assert.equal(water.confidence, 'emerging');
  const changed = new Map(cards);
  for (const build of taxonomy.clusters.filter(c => water.buildIds.includes(c.id))) for (const id of build.deckIds) {
    const counts = new Map(changed.get(id));
    counts.delete('Fracturize'); counts.delete('Primordial Ritual');
    changed.set(id, counts);
  }
  applyReviewedArchetypeEvidence([water], taxonomy.clusters, changed);
  assert.equal(water.name, 'Tera Silvie — Slimes');
  assert.equal(water.reviewedArchetypeEvidence!.waterPackageDeckCount, 0);
  assert.equal(water.reviewedArchetypeEvidence!.coreDeckCount, 45);
});

 test('Guo Jia shares seven command builds, keeps other families separate, and does not require the support package', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Guo Jia'));
  const reviewed = families.filter(s => s.reviewedArchetypeEvidence);
  assert.equal(reviewed.length, 3);
  assert.equal(reviewed.flatMap(s => s.buildIds).length, 7);
  assert.deepEqual(reviewed.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [1700, 829, 122]);
  assert.deepEqual(reviewed.map(s => s.reviewedArchetypeEvidence!.manifestationPackageDeckCount), [36, 322, 119]);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts); copy.delete('Auspicious Manifestation'); copy.delete('Beseech the Winds');
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 3);
  for (const family of families.filter(s => s.reviewedArchetypeEvidence)) {
    assert.equal(family.name, 'Wind Guo Jia — Shenju Commands');
    assert.equal(family.reviewedArchetypeEvidence!.manifestationPackageDeckCount, 0);
  }
  for (const id of ['1kd37dt', 'w5bdy7']) assert.deepEqual(families.find(s => s.id === id), taxonomy.strategyArchetypes.find(s => s.id === id));
});

test('Rai retains nine builds with optional Wind and build-specific Fire support', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Rai'));
  assert.equal(families.flatMap(s => s.buildIds).length, 9);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.coreDeckCount), [575, 356]);
  assert.deepEqual(families.map(s => s.reviewedArchetypeEvidence!.windPackageDeckCount), [0, 340]);
  const fire = Object.values(families[0].reviewedArchetypeEvidence!.firePackageByBuild!);
  assert.equal(fire.reduce((n, b) => n + b.count, 0), 497);
  assert.equal(fire.filter(b => b.count / b.total >= .9).length, 5);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts);
    for (const name of ['Arcane Elemental', 'Disorienting Winds', 'Three Visits', 'Creative Shock', 'Fireball']) copy.delete(name);
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  for (const family of families) {
    assert.equal(family.name, 'Arcane Rai — Arcane Blast');
    assert.equal(family.reviewedArchetypeEvidence!.windPackageDeckCount, 0);
    assert.ok(Object.values(family.reviewedArchetypeEvidence!.firePackageByBuild!).every(b => b.count === 0));
  }
});

 test('Zander retains three identities across 21 builds with optional packages and other families unchanged', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Zander'));
  const reviewed = families.filter(s => s.reviewedArchetypeEvidence);
  assert.equal(reviewed.length, 7);
  assert.equal(reviewed.flatMap(s => s.buildIds).length, 21);
  const expected: Record<string, [number, Record<string, number>]> = {
    '6ifose': [1797, { vulnerability: 927 }], yiifay: [200, { vulnerability: 192 }],
    yscd1r: [447, { redHare: 161 }], p9z2kg: [313, { redHare: 313 }],
    '9wv386': [104, { gildas: 11, lunete: 37 }], vx12rn: [51, { gildas: 50, lunete: 11 }], '1xh5iad': [13, { gildas: 1, lunete: 13 }],
  };
  for (const family of reviewed) {
    assert.deepEqual([family.reviewedArchetypeEvidence!.coreDeckCount, family.reviewedArchetypeEvidence!.packageDeckCounts], expected[family.id]);
  }
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts);
    for (const name of ['Incapacitate', 'Exploit Vulnerability', 'Red Hare, Unrivaled Stallion', 'Xiao Qiao, Cinderkeeper', 'Gildas, Chronicler of Aesa', 'Halocline Scout', 'Song of Frost', 'Lunete, Frostbinder Priest', 'Nia, Mistveiled Scout', 'Sadi, Blood Harvester']) copy.delete(name);
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  for (const family of families) {
    if (expected[family.id]) {
      assert.equal(family.name, taxonomy.strategyArchetypes.find(s => s.id === family.id)!.name);
      assert.equal(family.reviewedArchetypeEvidence!.coreDeckCount, expected[family.id][0]);
      assert.ok(Object.values(family.reviewedArchetypeEvidence!.packageDeckCounts!).every(count => count === 0));
    } else assert.deepEqual(family, taxonomy.strategyArchetypes.find(s => s.id === family.id));
  }
});

 test('Tristan cores preserve optional support and all other family data', () => {
  const families = structuredClone(taxonomy.strategyArchetypes.filter(s => s.championName === 'Tristan'));
  const expected: Record<string, number> = { ux2yxk: 3834, '1vu1559': 52, '1rb0t9a': 169, '1van2rl': 210, '4mnxjk': 22, '15ytls8': 50, '1s3agra': 41 };
  assert.equal(families.filter(s => s.reviewedArchetypeEvidence).length, 7);
  const changed = new Map([...cards].map(([id, counts]) => {
    const copy = new Map(counts);
    for (const name of ['Slice and Dice', 'Oath of the Sakura', 'Dilu, Auspicious Charger', 'Verita, Queen of Hearts', 'Three of Hearts', 'Straight Flare']) copy.delete(name);
    return [id, copy] as const;
  }));
  applyReviewedArchetypeEvidence(families, taxonomy.clusters, changed);
  for (const family of families) {
    const published = taxonomy.strategyArchetypes.find(s => s.id === family.id)!;
    if (!expected[family.id]) { assert.deepEqual(family, published); continue; }
    assert.equal(family.name, published.name);
    assert.equal(family.reviewedArchetypeEvidence!.coreDeckCount, expected[family.id]);
    assert.ok(Object.values(family.reviewedArchetypeEvidence!.packageDeckCounts!).every(count => count === 0));
    const { reviewedArchetypeEvidence: _a, ...actual } = family;
    const { reviewedArchetypeEvidence: _b, ...original } = published;
    assert.deepEqual(actual, original);
  }
});
