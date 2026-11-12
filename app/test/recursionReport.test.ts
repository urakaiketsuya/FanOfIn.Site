import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRaiDrawPolicy, estimateDrawAndDamageInfluence, recursionTarget, recursionDiscount, resolveRecursion, RECURSION_CARDS, computeRecursionReport, compareRecursionReports, type Card, type InfluenceDrawSource, type RecursionEffect } from '@gatcg/shared';
const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const imported = JSON.parse(readFileSync(new URL('./fixtures/tcgengine-recursion-contracts.json', import.meta.url), 'utf8'));
const existing = JSON.parse(readFileSync(new URL('./fixtures/rai-wind-conditional-draw.json', import.meta.url), 'utf8'));
const lines = (value: Record<string, number>) => Object.entries(value).map(([name, quantity]) => ({ name, quantity }));
const material = lines(existing.material);
const card = (name: string) => createRaiDrawPolicy([{ name, quantity: 1 }], material, catalog)!.main[0];
const source = (overrides: Partial<InfluenceDrawSource>): InfluenceDrawSource => ({ name: 'Filler', quantity: 1, reserve: 2, draws: 0, discard: 0, ...overrides });
const free = { rai: true, lineage: [1, 2, 3].map(n => ({ name: `Level ${n}`, memory: 0 })) };
const deck = { material, main: lines(existing.main).map(line => line.name === 'Aenean Flux Generator' ? { ...line, name: 'Cyclical Breeze' } : line.name === 'ChannelTech Charm S' ? { ...line, name: 'Aenean Cyclic Winds' } : line) };
function run(cards: InfluenceDrawSource[], turns = 5, opening = 7, progression = free) {
  const snapshots: Parameters<NonNullable<Parameters<typeof estimateDrawAndDamageInfluence>[8]>>[0][] = [];
  const points = estimateDrawAndDamageInfluence(cards, [], opening, 'first', turns, 1, progression, undefined, state => snapshots.push(state));
  for (const point of points) assert.equal(point.hand + point.memory + point.field + point.graveyard + point.banished + point.library, cards.reduce((n, c) => n + c.quantity, 0));
  return { points, snapshots };
}

test('upstream excerpts retain their integrity and catalog contracts do not drift', () => {
  assert.match(imported.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(imported.scenarios.length, 13);
  for (const scenario of imported.scenarios) assert.equal(createHash('sha256').update(scenario.excerpt).digest('hex'), scenario.excerptSha256);
  for (const name of RECURSION_CARDS) {
    const { effect, cost_reserve, element, types, classes, subtypes } = catalog.get(name)!;
    assert.deepEqual({ effect, cost_reserve, element, types, classes, subtypes }, imported.cards[name]);
  }
});
// Adapt existing seeded engine states to the analytics zone resolver. The engine's
// full timing and class environment are not replayed by these tests.
const cases: [string, RecursionEffect, string, 'hand' | 'memory'][] = [
  ['aenean-cyclic-winds-level-three-class-bonus-costs-two-less-and-returns-a-spell-to-memory', 'Aenean Cyclic Winds', 'Nascent Blast', 'memory'],
  ['lost-wisdom-class-bonus-with-a-unique-ally-costs-two-less-and-returns-a-spell-to-memory', 'Lost Wisdom', 'Purification', 'memory'],
  ['primeval-ritual-sacrifices-an-ally-and-returns-a-wind-card-to-memory', 'Primeval Ritual', 'Aenean Reclaim', 'memory'],
  ['breezy-looper-level-one-on-enter-returns-a-melody-from-the-graveyard-to-memory', 'Breezy Looper', 'Belted Tune', 'memory'],
  ['scavenge-the-distillery-returns-a-potion-item-from-the-graveyard-to-hand', 'Scavenge the Distillery', 'Distilled Water', 'hand'],
  ['advantageous-perch-distant-returns-a-ranger-action-and-banishes-itself', 'Advantageous Perch', 'Charge the Soul', 'hand'],
];
for (const [id, effect, targetName, destination] of cases) test(`upstream adapter: ${id}`, () => {
  const scenario = imported.scenarios.find((s: { id: string }) => s.id === id);
  assert.ok(scenario); assert.ok(scenario.excerpt.includes(`->seed('myGraveyard', '${targetName}')`));
  const target = card(targetName), zones = { hand: [] as InfluenceDrawSource[], memory: [] as InfluenceDrawSource[], graveyard: [target] };
  assert.equal(resolveRecursion(effect, target, zones), true);
  assert.deepEqual(zones[destination], [target]); assert.deepEqual(zones.graveyard, []);
  assert.equal(resolveRecursion(effect, target, zones), false); // same physical copy cannot move twice
});
test('upstream Cyclical Breeze self-target restriction and already-banished targets', () => {
  assert.ok(imported.scenarios.some((s: { id: string }) => s.id === 'cyclical-breeze-cannot-return-itself-while-resolving'));
  const resolving = card('Cyclical Breeze');
  assert.equal(resolveRecursion('Cyclical Breeze', resolving, { hand: [], memory: [], graveyard: [] }), false);
  const other = { ...resolving };
  const zones = { hand: [], memory: [], graveyard: [other] };
  assert.equal(resolveRecursion('Cyclical Breeze', resolving, zones), false);
  assert.equal(resolveRecursion('Cyclical Breeze', other, zones), true);
});
test('upstream discount boundaries include missing class and unique-ally requirements', () => {
  assert.equal(recursionDiscount('Aenean Cyclic Winds', 3, []), 2);
  assert.equal(recursionDiscount('Aenean Cyclic Winds', 2, []), 0);
  assert.equal(recursionDiscount('Aenean Cyclic Winds', 3, [], false), 0);
  assert.equal(recursionDiscount('Lost Wisdom', 1, [card('Camil, Basked Abundance')]), 2);
  assert.equal(recursionDiscount('Lost Wisdom', 1, [card('Academy Guide')]), 0);
  assert.equal(recursionDiscount('Lost Wisdom', 0, [card('Camil, Basked Abundance')]), 0);
  assert.equal(recursionDiscount('Cyclical Breeze', 0, []), 0);
  assert.equal(recursionDiscount('Cyclical Breeze', 1, []), 2);
});
test('typed targets reject wrong element/type/subtype and Surgery requires paid level two', () => {
  assert.equal(recursionTarget('Cyclical Breeze', card('Nascent Blast')), false);
  assert.equal(recursionTarget('Cyclical Breeze', card('Channel the Wind')), true);
  assert.equal(recursionTarget('Breezy Looper', card('Channel the Wind')), false);
  assert.equal(recursionTarget('Reconstructive Surgery', card('Delivery Droid')), true);
  assert.equal(recursionTarget('Reconstructive Surgery', card('Academy Guide')), false);
  assert.equal(recursionTarget('Scavenge the Distillery', card('Academy Guide')), false);
  assert.equal(recursionTarget('Advantageous Perch', card('Cyclical Breeze')), false);
  assert.equal(card('Reconstructive Surgery').minimumLevel, 2);
  assert.equal(card('Breezy Looper').minimumLevel, 1);
});
test('off-element recursion remains unavailable, Exalted requires paid advanced access', () => {
  const water = material.map(line => line.name === 'Spirit of Wind' ? { ...line, name: 'Spirit of Water' } : line);
  assert.equal(createRaiDrawPolicy([{ name: 'Cyclical Breeze', quantity: 4 }], water, catalog)!.main[0].recursion, undefined);
  assert.equal(card('Advantageous Perch').minimumLevel, 3);
});
test('empty graveyard does not manufacture a target or spend recovery sources', () => {
  const result = run([source({ ...card('Cyclical Breeze'), quantity: 20 })]);
  assert.ok(result.snapshots.every(s => s.recursion.hand === 0));
  assert.ok(result.points.every(p => p.graveyard === 0));
});
test('finite return/replay loops preserve zones and never count returns as new library access', () => {
  const cards = [source({ quantity: 10, name: 'Draw', draws: 1, reserve: 1, resolvesTo: 'graveyard', spell: true, element: 'WIND' }), source({ ...card('Cyclical Breeze'), quantity: 10 }), source({ quantity: 10 })];
  const { snapshots, points } = run(cards, 10, 15);
  assert.ok(snapshots[9].recursion.hand > 0); assert.ok(snapshots[9].recursion.replayed > 0);
  assert.ok(points.every(p => p.seen <= 30));
  assert.ok(snapshots.every(s => s.recursion.replayed <= s.recursion.hand + s.recursion.memory));
  assert.deepEqual(run(cards, 10, 15), { snapshots, points });
});
test('Primeval cannot play without an ally and sacrifices one actual object per activation', () => {
  const base = [source({ ...card('Primeval Ritual'), quantity: 8 }), source({ quantity: 12, name: 'Draw', draws: 1, reserve: 1, resolvesTo: 'graveyard', spell: true, element: 'WIND' })];
  assert.ok(run(base, 5, 15).snapshots.every(s => s.recursion.memory === 0));
  const result = run([...base, source({ ...card('Academy Guide'), quantity: 4 })], 5, 15);
  assert.ok(result.snapshots[4].recursion.memory > 0);
  assert.ok(result.snapshots[4].recursion.memory <= 4);
});
test('returned-to-memory cards cannot be replayed in the same main phase', () => {
  const cards = [source({ quantity: 5, name: 'Draw', draws: 1, reserve: 1, resolvesTo: 'graveyard', spell: true }), source({ ...card('Lost Wisdom'), quantity: 5 }), source({ quantity: 20 })];
  const result = run(cards, 5, 20);
  assert.ok(result.snapshots[0].recursion.memory > 0);
  assert.equal(result.snapshots[0].recursion.replayed, 0);
  assert.ok(result.snapshots[4].recursion.replayed > 0);
});
test('report and comparison share seeded trajectories, canonical order and sideboard exclusion', () => {
  const report = computeRecursionReport(deck, catalog, 32), paired = compareRecursionReports(deck, deck, catalog, 32);
  assert.equal(report.status, 'ready'); assert.equal(paired.status, 'ready');
  if (report.status !== 'ready' || paired.status !== 'ready') return;
  assert.ok(report.points[4].returned.ready > 0);
  for (const point of paired.points) { assert.deepEqual(point.before, report.points[point.turn - 1]); assert.deepEqual(point.before, point.after); }
  assert.deepEqual(computeRecursionReport({ ...deck, main: [...deck.main].reverse(), sideboard: [{ name: 'Missing', quantity: 4 }] }, catalog, 32), report);
  const baseline = { ...deck, main: lines(existing.main) };
  const changed = compareRecursionReports(baseline, deck, catalog, 32);
  assert.equal(changed.status, 'ready');
  if (changed.status === 'ready') { assert.equal(changed.points[1].before.returned.ready, 0); assert.ok(changed.points[1].after.returned.ready > 0); }
});
test('missing catalog and unsupported champions are unavailable rather than zero', () => {
  const missing = new Map(catalog); missing.delete('Cyclical Breeze');
  assert.equal(computeRecursionReport(deck, missing).status, 'missing');
  assert.equal(computeRecursionReport({ ...deck, material: [] }, catalog).status, 'unsupported');
  assert.equal(compareRecursionReports(deck, { ...deck, material: [] }, catalog).status, 'unsupported');
});

test('unaffordable recovery leaves its target untouched; source cannot pay for itself', () => {
  const cards = [source({ quantity: 10, name: 'Draw', draws: 1, reserve: 1, resolvesTo: 'graveyard', spell: true }), source({ ...card('Lost Wisdom'), quantity: 10, reserve: 100 })];
  const result = run(cards);
  assert.ok(result.snapshots.every(s => s.recursion.memory === 0));
  assert.ok(result.snapshots[4].graveyard.some(c => c.name === 'Draw'));
});
test('Perch goes to banishment while an ally recovery source stays on the field', () => {
  const fuel = source({ quantity: 10, name: 'Target', draws: 1, reserve: 1, resolvesTo: 'graveyard', action: true, subtypes: ['RANGER', 'MELODY'] });
  for (const name of ['Advantageous Perch', 'Breezy Looper']) {
    const result = run([fuel, source({ ...card(name), quantity: 5 }), source({ quantity: 15 })], 5, 20);
    const last = result.snapshots[4];
    assert.ok(last.recursion.hand + last.recursion.memory > 0, name);
    assert.ok(!last.graveyard.some(c => c.name === name));
    if (name === 'Advantageous Perch') assert.ok(result.points[4].banished > 0);
    else assert.ok(result.points[4].field > 0);
  }
});
test('Floating Memory consumes the same physical graveyard pool as recovery', () => {
  const cards = [source({ quantity: 10, name: 'Fuel', draws: 1, reserve: 1, resolvesTo: 'graveyard', spell: true, floatingMemory: 'always' }), source({ ...card('Lost Wisdom'), quantity: 5 }), source({ quantity: 15 })];
  const paid = { ...free, lineage: free.lineage.map(line => ({ ...line, memory: 3 })) };
  const result = run(cards, 5, 15, paid);
  assert.ok(result.points[4].floatingMemoryPaid > 0);
  assert.ok(result.snapshots[4].recursion.memory > 0);
  assert.ok(result.points[4].banished > 0);
});
