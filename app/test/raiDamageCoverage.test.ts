import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeRaiDamageReport, compareRaiDamageReports, RAI_DAMAGE_CARDS, RAI_DAMAGE_SCENARIOS, estimateDrawAndDamageInfluence, estimateDrawInfluence, type Card, type InfluenceDrawSource } from '@gatcg/shared';
import { paidDamageOutput, type PaidDamageEffect, type PaidDamageScenario } from '../../shared/src/paidDamagePolicy';

const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/rai-fire-draw.json', import.meta.url), 'utf8'));
const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({ name, quantity }));
const deck = { main: lines(fixture.main), material: lines(fixture.material) };
const progression = { rai: true as const, spiritLife: 15, lineage: [{ name: 'One', memory: 1, life: 19 }, { name: 'Two', memory: 2, life: 22 }, { name: 'Three', memory: 3, life: 25 }] };
const champion = RAI_DAMAGE_SCENARIOS[0], ally = RAI_DAMAGE_SCENARIOS[1], wide = RAI_DAMAGE_SCENARIOS[2];
const source = (damage: PaidDamageEffect, overrides: Partial<InfluenceDrawSource> = {}): InfluenceDrawSource => ({ name: damage, quantity: 1, draws: 0, discard: 0, reserve: 0, resolvesTo: 'graveyard', fireElement: true, mageAction: true, damage, ...overrides });
const run = (main: InfluenceDrawSource[], scenario: PaidDamageScenario = champion, policy = progression, turns = 5, samples = 1) => estimateDrawAndDamageInfluence(main, [], 7, 'first', turns, samples, policy, scenario);
const conserved = (points: ReturnType<typeof run>, size: number) => {
  for (const p of points) assert.equal(p.hand + p.memory + p.graveyard + p.banished + p.field + p.library, size);
};

test('catalog contracts cover every damage Action in the fixture and exclude destruction', () => {
  const expected: [string, number, RegExp][] = [
    ['Fireball', 4, /Deal 1\+\*\*LV\*\* damage to target unit/],
    ['Focused Flames', 2, /Deal 4 damage to target ally/],
    ['Gilded Pyre', 2, /buff.*deal 4 damage/],
    ['Ignite Fate', 3, /Deal 2 damage to each champion/],
    ['Ignite the Soul', 1, /Deal 1 damage to target unit/],
    ['Innervate Fury', 3, /delevel.*recover 5[\s\S]*7 damage split among/],
    ['Intensified Pyre', 3, /Kindle 3[\s\S]*eight or more[\s\S]*6 damage/],
    ['Purge in Flames', 8, /Efficiency[\s\S]*except for your champion[\s\S]*3 damage/],
    ['Pyroclastic Flow', 4, /Deal 2 damage to all units/],
    ['Set Ablaze', 2, /4 damage to target ally[\s\S]*Level 3\+[\s\S]*3 damage to each champion/],
  ];
  assert.deepEqual([...RAI_DAMAGE_CARDS].sort(), expected.map(([name]) => name).sort());
  for (const [name, reserve, effect] of expected) {
    const card = catalog.get(name)!;
    assert.equal(card.cost_reserve, reserve, name);
    assert.equal(card.element, 'FIRE', name);
    assert.ok(card.types.includes('ACTION') && card.classes.includes('MAGE'), name);
    assert.match(card.effect!, effect, name);
  }
  assert.match(catalog.get('Ignite Fate')!.effect!, /\*\*Floating Memory\*\*/);
  assert.match(catalog.get('Ignite the Soul')!.effect!, /\[Class Bonus\] \*\*Floating Memory\*\*/);
  assert.match(catalog.get('Reduce to Ash')!.effect!, /^Destroy target/);
  const damageNames = Object.keys(fixture.main).filter(name => /\bDeal\b.*\bdamage\b/.test(catalog.get(name)!.effect!));
  assert.deepEqual(damageNames.sort(), [...RAI_DAMAGE_CARDS].sort());
});

test('targeted, split and area damage keep champions, allies and self separate', () => {
  assert.deepEqual(paidDamageOutput('pyroclastic-flow', 0, wide), { champion: 2, allies: 4, self: 2, ownAllies: 2 });
  assert.deepEqual(paidDamageOutput('purge-flames', 3, wide), { champion: 3, allies: 6, self: 0, ownAllies: 3 });
  assert.deepEqual(paidDamageOutput('ignite-fate', 3, wide), { champion: 2, allies: 0, self: 2, ownAllies: 0 });
  assert.equal(paidDamageOutput('innervate-fury', 3, wide).allies, 7);
  assert.equal(paidDamageOutput('focused-flames', 3, champion).allies, 0);
  assert.equal(paidDamageOutput('set-ablaze', 2, ally).champion, 0);
  assert.equal(paidDamageOutput('set-ablaze', 3, ally).champion, 3);
  assert.equal(paidDamageOutput('set-ablaze', 3, champion).champion, 0);
  assert.equal(paidDamageOutput('fireball', 3, ally).champion, 0);
  assert.equal(paidDamageOutput('fireball', 3, ally).allies, 4);
  assert.equal(paidDamageOutput('gilded-pyre', 3, { ...ally, buffed: true }).allies, 4);
  assert.equal(paidDamageOutput('intensified-pyre', 3, { ...champion, opposingGraveyard: 7 }).champion, 2);
  assert.equal(paidDamageOutput('intensified-pyre', 0, { ...champion, opposingGraveyard: 8 }).champion, 6);
});

test('ally-only spells require a target and Focused Flames gets only the paid Mage discount', () => {
  const flames = source('focused-flames', { quantity: 30, reserve: 2 });
  const absent = run([flames]);
  assert.ok(absent.every(p => p.paidDamageRange.high === 0 && p.paidAllyDamageRange.high === 0 && p.graveyard === 0));
  const points = run([flames], ally);
  assert.equal(points[0].paidAllyDamageRange.median, 8);
  assert.equal(points[0].memory, 4);
  assert.equal(points[1].paidAllyDamageRange.median, 16); // Two more casts at reserve 1.
  assert.equal(points[1].memory, 2);
  assert.ok(points.every(p => p.paidDamageRange.high === 0));
  conserved(points, 30);
});

test('Kindle consumes only prior fire graveyard cards and never pays twice', () => {
  const pyre = source('intensified-pyre', { quantity: 7, reserve: 3 });
  const points = run([pyre], champion, { ...progression, lineage: [] }, 5);
  assert.equal(points[0].paidDamageRange.median, 4); // First pays 3, second uses first resolved Pyre + 2 reserve.
  assert.equal(points[0].kindlePaid, 1);
  assert.equal(points[0].memory, 5);
  assert.equal(points[0].graveyard, 1);
  assert.equal(points[0].banished, 1);
  assert.ok(points.every(p => p.kindlePaid < p.paidDamageRange.median / 2));
  const nonFire = run([{ ...pyre, fireElement: false }], champion, { ...progression, lineage: [] });
  assert.equal(nonFire[0].paidDamageRange.median, 2);
  assert.ok(nonFire.every(p => p.kindlePaid === 0));
  const blocked = run([{ ...pyre, reserve: 8 }]);
  assert.ok(blocked.every(p => p.kindlePaid === 0 && p.graveyard === 0));
  conserved(points, 7); conserved(nonFire, 7);
});

test('Kindle and Floating Memory compete for the same finite graveyard', () => {
  const points = run([source('ignite-soul', { quantity: 4, floatingMemory: 'always' }), source('intensified-pyre', { quantity: 3, reserve: 3 })], champion, progression, 5, 64);
  for (const p of points) {
    assert.ok(p.banished >= p.kindlePaid + p.floatingMemoryPaid); // Remaining materialization cost banishes actual memory.
    assert.ok(p.kindlePaid + p.floatingMemoryPaid <= 7);
  }
  conserved(points, 7);
  const consumed = run([source('ignite-soul', { floatingMemory: 'always' }), source('intensified-pyre', { reserve: 1 })]);
  assert.equal(consumed[0].kindlePaid, 1);
  assert.ok(consumed.every(p => p.floatingMemoryPaid === 0 && p.paidLevel === 0));
  assert.equal(consumed[4].banished, 1); // The same Soul cannot also pay the next materialization.
  conserved(consumed, 2);
});

test('Fury requires five actual damage counters and a removable level; recovery is spent once', () => {
  const fury = source('innervate-fury', { quantity: 7 });
  const freeLevels = { ...progression, lineage: progression.lineage.map(card => ({ ...card, memory: 0 })) };
  const absent = run([fury], { ...ally, startingDamage: 4 }, freeLevels);
  assert.ok(absent.every(p => p.paidAllyDamageRange.high === 0 && p.paidRecoveryRange.high === 0));
  const paid = run([fury], { ...wide, startingDamage: 5 }, freeLevels);
  assert.equal(paid[0].paidAllyDamageRange.median, 0); // Cannot delevel the starting Spirit.
  assert.equal(paid[1].paidAllyDamageRange.median, 7);
  assert.equal(paid[1].paidLevel, 0);
  assert.equal(paid[4].paidAllyDamageRange.median, 7);
  assert.equal(paid[4].paidRecoveryRange.median, 5);
  assert.equal(paid[4].paidSelfDamageRange.median, 0); // Starting injury is not inflicted by the deck.
  assert.equal(paid[4].paidLevel, 3); // Returned champions can be paid for again.
  const unaffordable = run([{ ...fury, reserve: 100 }], { ...ally, startingDamage: 5 }, freeLevels);
  assert.equal(unaffordable[1].paidLevel, 1);
  assert.equal(unaffordable[4].paidRecoveryRange.median, 0);
  conserved(paid, 7);
});

// Arrange a known first sample without changing the production RNG or play policy.
function seededOrder(desired: InfluenceDrawSource[]) {
  const indices = desired.map((_, i) => i);
  let seed = 1739;
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = Math.floor(seed / 4294967296 * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const input: InfluenceDrawSource[] = [];
  indices.forEach((original, position) => { input[original] = desired[position]; });
  return input;
}

test('area damage kills physical Guides, removes their discount, and ally damage clears between turns', () => {
  const guide: InfluenceDrawSource = { name: 'Guide', quantity: 1, draws: 0, discard: 0, reserve: 0, mechanic: 'academy-guide', resolvesTo: 'field', allyLife: 3 };
  const purge = run(seededOrder([guide, source('purge-flames', { minimumLevel: 1 })]));
  assert.equal(purge[0].field, 1);
  assert.equal(purge[1].field, 0); // Mage Purge kills the 3-life Guide.
  assert.equal(purge[1].paidLevel, 1); // Guide discounted this materialization before dying.
  assert.equal(purge[2].paidLevel, 1); // No stale discount or memory available for level two.
  const together = run(seededOrder([guide, source('pyroclastic-flow'), source('pyroclastic-flow')]));
  assert.equal(together[0].field, 0); // Two Flows in the same turn kill the same physical Guide.
  const filler: InfluenceDrawSource = { name: 'Filler', quantity: 1, draws: 0, reserve: null, discard: 0 };
  const apart = run(seededOrder([guide, source('pyroclastic-flow'), ...Array.from({ length: 5 }, () => ({ ...filler })), source('pyroclastic-flow')]));
  assert.equal(apart[0].field, 1);
  assert.equal(apart[1].field, 1); // First Flow's ally damage cleared before the next natural draw.
  assert.equal(apart[1].paidSelfDamageRange.median, 4); // Champion damage did not clear.
  conserved(purge, 2); conserved(together, 3); conserved(apart, 8);
});

test('self-inflicted lethal stops later plays and turns rather than producing unlimited output', () => {
  const points = run([source('ignite-fate', { quantity: 30 })], champion, { ...progression, spiritLife: 3 });
  assert.ok(points.every(p => p.paidDamageRange.median === 4 && p.paidSelfDamageRange.median === 4));
  assert.ok(points.every(p => p.seen === 7));
  conserved(points, 30);
});

test('all automatic scenario comparisons match standalone results, canonical splits and removals', () => {
  const before = computeRaiDamageReport(deck, catalog);
  const removed = { ...deck, main: deck.main.filter(line => !RAI_DAMAGE_CARDS.some(name => name === line.name)) };
  const comparison = compareRaiDamageReports(deck, removed, catalog);
  assert.equal(before.status, 'ready'); assert.equal(comparison.status, 'ready');
  if (before.status !== 'ready' || comparison.status !== 'ready') return;
  assert.equal(before.damageSources.length, 10);
  assert.equal(before.scenarios.length, 6);
  for (const [index, scenario] of comparison.scenarios.entries()) {
    assert.deepEqual(scenario.points.map(p => p.before), [before.scenarios[index].points[2], before.scenarios[index].points[4]]);
    assert.ok(scenario.points.every(p => p.after.damage.high === 0 && p.after.allies.high === 0 && p.after.self.high === 0));
  }
  const split = { ...deck, main: deck.main.flatMap(line => [{ ...line, quantity: 1 }, { ...line, quantity: 3 }]).reverse() };
  assert.deepEqual(before, computeRaiDamageReport(split, catalog));
  const offElement = computeRaiDamageReport({ ...deck, material: deck.material.map(line => line.name === 'Spirit of Fire' ? { ...line, name: 'Spirit of Water' } : line) }, catalog);
  assert.equal(offElement.status, 'ready');
  if (offElement.status === 'ready') assert.ok(offElement.scenarios.every(s => s.points.every(p => p.damage.high === 0 && p.allies.high === 0)));
});

test('missing costs/life stay unavailable and legacy draw-only return shape is unchanged', () => {
  for (const name of RAI_DAMAGE_CARDS) {
    const missing = new Map(catalog); missing.set(name, { ...catalog.get(name)!, cost_reserve: null });
    assert.equal(computeRaiDamageReport(deck, missing).status, 'missing', name);
  }
  const missingLife = new Map(catalog); missingLife.set('Academy Guide', { ...catalog.get('Academy Guide')!, life: null });
  assert.equal(computeRaiDamageReport(deck, missingLife).status, 'missing');
  const legacy = estimateDrawInfluence([source('ignite-soul')], [], 7, 'first', 1, 1, progression)[0];
  assert.deepEqual(Object.keys(legacy).sort(), ['extraAccess', 'hand', 'influence', 'memory', 'seen', 'seenRange']);
});

test('Purge pays Efficiency using actual level, and Set Ablaze splash waits for level three', () => {
  const freeLevels = { ...progression, lineage: progression.lineage.map(card => ({ ...card, memory: 0 })) };
  const purge = run([source('purge-flames', { quantity: 30, reserve: 8 })], wide, freeLevels);
  assert.equal(purge[0].paidDamageRange.median, 0);
  assert.equal(purge[1].paidDamageRange.median, 3);
  assert.equal(purge[1].memory, 7);
  assert.equal(purge[2].paidDamageRange.median, 6);
  assert.equal(purge[2].memory, 6);
  assert.equal(purge[2].paidAllyDamageRange.median, 12);
  const ablaze = run([source('set-ablaze', { quantity: 30, reserve: 2 })], ally, freeLevels);
  assert.ok(ablaze.slice(0, 3).every(p => p.paidDamageRange.high === 0));
  assert.ok(ablaze[3].paidDamageRange.median > 0);
  assert.ok(ablaze.every(p => p.paidSelfDamageRange.high === 0));
});

test('Fury can spend accumulated self-damage without invented opponent attacks', () => {
  const freeLevels = { ...progression, lineage: progression.lineage.map(card => ({ ...card, memory: 0 })) };
  const points = run([source('ignite-fate', { quantity: 3 }), source('innervate-fury')], ally, freeLevels);
  assert.equal(points[0].paidSelfDamageRange.median, 6);
  assert.equal(points[0].paidAllyDamageRange.median, 0);
  assert.equal(points[1].paidAllyDamageRange.median, 7);
  assert.equal(points[1].paidRecoveryRange.median, 5);
  assert.equal(points[1].paidLevel, 0);
  assert.equal(points[4].paidSelfDamageRange.median, 6);
  conserved(points, 4);
});

test('conditional replacements do not alter physical payments or multiply unrelated damage', () => {
  const gilded = [source('gilded-pyre', { quantity: 7, reserve: 2 })];
  const normal = run(gilded), buffed = run(gilded, { ...champion, buffed: true });
  const pyre = [source('intensified-pyre', { quantity: 7, reserve: 3 })];
  const lowGrave = run(pyre), highGrave = run(pyre, { ...champion, opposingGraveyard: 8 });
  for (let i = 0; i < 5; i++) {
    assert.equal(buffed[i].paidDamageRange.median, 2 * normal[i].paidDamageRange.median);
    assert.equal(highGrave[i].paidDamageRange.median, 3 * lowGrave[i].paidDamageRange.median);
    assert.equal(highGrave[i].kindlePaid, lowGrave[i].kindlePaid);
    assert.equal(buffed[i].memory, normal[i].memory);
  }
});


test('releveling Spellcrafter spends newly accumulated enlighten without waiting for another spell', () => {
  const freeLevels = { ...progression, lineage: progression.lineage.map(card => ({ ...card, memory: 0 })) };
  const points = run([source('innervate-fury', { quantity: 30 })], { ...ally, startingDamage: 5 }, freeLevels);
  assert.equal(points[1].paidLevel, 0);
  assert.equal(points[1].seen, 8);
  assert.equal(points[2].paidLevel, 1);
  assert.equal(points[2].seen, 10); // Natural ninth card plus one from 2 + 2 enlighten.
  assert.equal(points[2].paidRecoveryRange.median, 5);
  conserved(points, 30);
});
