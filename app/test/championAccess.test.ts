import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { REVIEWED_SPIRITS, REVIEWED_LINEAGES, reviewedChampionAccess, hasReviewedElementAccess, createRaiDrawPolicy, computeRaiDamageReport, computeDefenseReport, compareDefenseReports, computeRecursionReport, compareRecursionReports, computeTonorisDrawReport, estimateDrawInfluence, type Card } from '@gatcg/shared';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((c: Card) => [c.name, c]));
const imported = JSON.parse(readFileSync(new URL('./fixtures/tcgengine-champion-access.json', import.meta.url), 'utf8'));
const lines = (value: Record<string, number>) => Object.entries(value).map(([name, quantity]) => ({ name, quantity }));
const fixture = (name: string) => { const f = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')); return { main: lines(f.main), material: lines(f.material) }; };
const material = (family: keyof typeof REVIEWED_LINEAGES, spirit: string) => [spirit, ...REVIEWED_LINEAGES[family]].map(name => ({ name, quantity: 1 }));

test('imported source and catalog contracts retain provenance', () => {
  assert.equal(imported.scenarios.length, 17);
  assert.match(imported.sourceRevision, /^[a-f0-9]{40}$/);
  for (const s of imported.scenarios) assert.equal(createHash('sha256').update(s.excerpt).digest('hex'), s.excerptSha256);
  for (const snapshot of imported.cards) {
    const { name, effect, element, level, cost_memory, life, classes } = catalog.get(snapshot.name)!;
    assert.deepEqual({ name, effect, element, level, cost_memory, life, classes }, snapshot);
  }
});
for (const [spirit, element] of Object.entries(REVIEWED_SPIRITS)) test(`upstream seven-card opening adapter: ${spirit}`, () => {
  const source = imported.scenarios.find((s: { excerpt: string }) => s.excerpt.includes(`'${spirit}'`));
  assert.ok(source);
  assert.match(source.excerpt, /expectZoneCount\('myHand', (7|14)/);
  for (const family of ['rai', 'diao', 'tonoris'] as const) {
    const access = reviewedChampionAccess(material(family, spirit), catalog, family)!;
    assert.equal(access.element, element);
    assert.equal(access.lineage.length, 3);
  }
  const policy = createRaiDrawPolicy([{ name: 'Dungeon Guide', quantity: 30 }], material('rai', spirit), catalog)!;
  assert.equal(estimateDrawInfluence(policy.main, [], 7, 'first', 1, 1, policy.progression)[0].seen, 7);
});
test('advanced and Exalted access follows paid champion level, not basic element', () => {
  assert.ok(imported.scenarios.find((s: { id: string }) => s.id === 'exalted-card-is-not-playable-without-an-advanced-element'));
  for (const advanced of ['ARCANE', 'TERA', 'NEOS']) for (let level = 0; level <= 3; level++) {
    assert.equal(hasReviewedElementAccess('EXALTED', 'WIND', advanced, level), level === 3);
    assert.equal(hasReviewedElementAccess(advanced, 'WIND', advanced, level), level === 3);
    assert.equal(hasReviewedElementAccess('FIRE', 'WIND', advanced, level), false);
    assert.equal(hasReviewedElementAccess('WIND', 'WIND', advanced, level), true);
  }
});
test('ambiguous, duplicate, incomplete and unreviewed lineages remain unsupported', () => {
  const base = material('rai', 'Spirit of Wind');
  for (const bad of [base.slice(0, 3), [...base, { name: 'Spirit of Fire', quantity: 1 }], [...base, base[1]], base.map(l => l.name === 'Rai, Mana Weaver' ? { ...l, name: 'Rai, Storm Seer' } : l), base.map(l => l.name === 'Spirit of Wind' ? { ...l, name: 'Spirit of Serene Wind' } : l)]) {
    assert.equal(createRaiDrawPolicy([], bad, catalog), null);
  }
  assert.ok(createRaiDrawPolicy([], [...base, { name: 'Spirit of Fire', quantity: 0 }], catalog));
});
test('Rai named Fire Spirit preserves paid draw and damage, including starting life', () => {
  const base = fixture('rai-fire-draw'), named = { ...base, material: material('rai', 'Hanabi, Spirit of Fire') };
  const a = createRaiDrawPolicy(base.main, base.material, catalog)!, b = createRaiDrawPolicy(named.main, named.material, catalog)!;
  assert.deepEqual(estimateDrawInfluence(a.main, [], 7, 'first', 5, 32, a.progression), estimateDrawInfluence(b.main, [], 7, 'first', 5, 32, b.progression));
  assert.deepEqual(computeRaiDamageReport(base, catalog), computeRaiDamageReport(named, catalog));
});
test('named Wind Spirit preserves recursion and paired report values', () => {
  const base = fixture('rai-wind-conditional-draw');
  base.main = base.main.map(l => l.name === 'Aenean Flux Generator' ? { ...l, name: 'Cyclical Breeze' } : l);
  const named = { ...base, material: material('rai', 'Kaze, Spirit of Wind') };
  assert.deepEqual(computeRecursionReport(base, catalog, 32), computeRecursionReport(named, catalog, 32));
  const comparison = compareRecursionReports(base, named, catalog, 32);
  assert.equal(comparison.status, 'ready');
  if (comparison.status === 'ready') for (const point of comparison.points) assert.deepEqual(point.before, point.after);
});
test('Diao named Spirit preserves defense and comparison outcomes', () => {
  const base = fixture('diao-wind-defense'), named = { ...base, material: material('diao', 'Brissa, Spirit of Wind') };
  assert.deepEqual(computeDefenseReport(base, catalog, 32), computeDefenseReport(named, catalog, 32));
  const comparison = compareDefenseReports(base, named, catalog, 32);
  assert.equal(comparison.status, 'ready');
  if (comparison.status === 'ready') for (const scenario of comparison.scenarios) for (const point of scenario.points) assert.deepEqual(point.before, point.after);
});
test('Tonoris named Water Spirit retains baseline, Fire/Wind exclude Water engine activations', () => {
  const base = fixture('tonoris-water');
  assert.deepEqual(computeTonorisDrawReport(base, catalog, 32), computeTonorisDrawReport({ ...base, material: material('tonoris', 'Miao, Spirit of Water') }, catalog, 32));
  for (const spirit of ['Aithne, Spirit of Fire', 'Gwendolyn, Spirit of Wind']) {
    const report = computeTonorisDrawReport({ ...base, material: material('tonoris', spirit) }, catalog, 32);
    assert.ok(report); assert.deepEqual(report.missing, []);
    assert.equal(computeDefenseReport({ ...base, material: material('tonoris', spirit) }, catalog, 32).status, 'ready');
  }
  const waterOnly = { main: [{ name: 'Dormant Sacrificial Altar', quantity: 30 }], material: material('tonoris', 'Spirit of Fire') };
  const report = computeTonorisDrawReport(waterOnly, catalog, 1)!;
  assert.ok(report.points.every(p => p.extra.high === 0));
});
test('off-element draw and recursion cannot activate but remain physical payment cards', () => {
  const policy = createRaiDrawPolicy([{ name: 'Cyclical Breeze', quantity: 4 }, { name: 'Gloamspire, Black Market', quantity: 4 }, { name: 'Tempestuous Conviction', quantity: 4 }], material('rai', 'Minthe, Spirit of Water'), catalog)!;
  assert.equal(policy.main[0].recursion, undefined);
  assert.equal(policy.main[0].minimumLevel, Infinity);
  assert.equal(policy.main[1].mechanic, undefined);
  assert.equal(policy.main[2].minimumLevel, 3);
  assert.equal(policy.modeled.has('Cyclical Breeze'), false);
  assert.equal(policy.main.reduce((sum, c) => sum + c.quantity, 0), 12);
});
test('sideboard and zero-quantity Material do not grant access; missing catalog is unavailable', () => {
  const base = fixture('rai-fire-draw');
  const withSideboard = { ...base, sideboard: material('diao', 'Spirit of Water') };
  assert.deepEqual(computeDefenseReport(base, catalog, 8), computeDefenseReport(withSideboard, catalog, 8));
  const missing = new Map(catalog); missing.delete('Hanabi, Spirit of Fire');
  const named = { ...base, material: material('rai', 'Hanabi, Spirit of Fire') };
  assert.equal(computeRaiDamageReport(named, missing).status, 'missing');
  assert.equal(computeDefenseReport(named, missing, 8).status, 'missing');
  assert.equal(computeRecursionReport(named, missing, 8).status, 'missing');
  assert.equal(compareDefenseReports(base, named, missing, 8).status, 'missing');
});
