import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeJinFuelReport, createJinFuelPolicy, estimateDrawAndDamageInfluence, type Card, type InfluenceDrawSource } from '@gatcg/shared';
import { createJinFuelSequence, type JinFuelCheckpoint } from '../../shared/src/jinFuelSequence';

const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/jin-crescendo.json', import.meta.url), 'utf8'));
const lines = (values: Record<string, number>) => Object.entries(values).map(([name, quantity]) => ({ name, quantity }));
const deck = { main: lines(fixture.main), material: lines(fixture.material) };
const source = (name: string, extra: Partial<InfluenceDrawSource> = {}): InfluenceDrawSource => ({ name, quantity: 1, reserve: 0, draws: 0, discard: 0, ...extra });
const fire = () => source('Fire fuel', { fireElement: true });
const crescendo = () => source('Volcanic Crescendo', { jinFuelRole: 'crescendo', fireElement: true, subtypes: ['HARMONY'], resolvesTo: 'graveyard' });
const songstress = () => source('Sly Songstress', { jinFuelRole: 'songstress', fireElement: true, subtypes: ['MELODY'], resolvesTo: 'field' });
function harness() {
  const hand: InfluenceDrawSource[] = [], memory: InfluenceDrawSource[] = [], graveyard: InfluenceDrawSource[] = [], field: InfluenceDrawSource[] = [], banished: InfluenceDrawSource[] = [];
  let level = 0, draws = 0, damage = 0;
  const points: JinFuelCheckpoint[] = [];
  const sequence = createJinFuelSequence({ hand: () => hand, memory: () => memory, graveyard, field, banished, level: () => level,
    levelUp: () => { level++; }, draw: n => { draws += n; }, random: () => 0, scavenge: () => {}, damage: n => { damage += n; } },
  { messengerAttacks: true, checkpoint: point => points.push(point) });
  return { hand, memory, graveyard, field, banished, sequence, points, draws: () => draws, damage: () => damage, level: () => level };
}

test('reviewed catalog establishes the actual discard, Melody and Crescendo contracts', () => {
  for (const name of ['Creative Shock', 'Creative Tinder']) assert.match(catalog.get(name)!.effect!, /Draw two cards, then discard a card/);
  assert.match(catalog.get('Package Courier')!.effect!, /On Enter.*discard a card.*draw a card/);
  assert.match(catalog.get('Hasty Messenger')!.effect!, /On Attack.*discard a card.*draw a card/);
  assert.ok(catalog.get('Sly Songstress')!.subtypes.includes('MELODY'));
  assert.match(catalog.get('Sly Songstress')!.effect!, /Whenever you activate a Harmony or a Melody card/);
  assert.match(catalog.get('Volcanic Crescendo')!.effect!, /Banish any amount of fire element cards from your graveyard/);
  assert.match(catalog.get('Volcanic Crescendo')!.effect!, /Empower 3\+X/);
  assert.match(catalog.get('Volcanic Crescendo')!.effect!, /Melody card this turn.*deal.*damage to each champion/);
  assert.equal(catalog.get('Volcanic Crescendo')!.cost_reserve, 2);
  assert.match(catalog.get('Musical Curator')!.effect!, /Scavenge 12/);
  assert.match(catalog.get('Dungeon Guide')!.effect!, /banish two cards at random from your memory/);
  assert.match(catalog.get('Liminal Guide')!.effect!, /Whenever your champion levels up/);
});

test('discard selects spare Fire before protected payoff; reserve moves are not discards', () => {
  const h = harness(), payoff = crescendo(), fuel = fire();
  h.hand.push(payoff, fuel, source('Non-Fire'));
  h.sequence.discard(1);
  assert.deepEqual(h.graveyard, [fuel]); assert.ok(h.hand.includes(payoff));
  h.sequence.rank(h.hand, false);
  h.memory.push(...h.hand.splice(0, 1));
  assert.equal(h.graveyard.length, 1); assert.equal(h.memory[0].name, 'Non-Fire');
});

test('Songstress triggers before Crescendo resolution and a new Songstress never triggers itself', () => {
  const h = harness(), singer = songstress(); h.hand.push(fire());
  h.sequence.activate(singer); assert.equal(h.draws(), 0);
  h.sequence.resolve(singer); h.field.push(singer);
  h.graveyard.push(fire(), fire(), fire());
  const payoff = crescendo(); h.sequence.activate(payoff);
  assert.equal(h.draws(), 1); assert.equal(h.graveyard.length, 4);
  h.sequence.resolve(payoff); h.graveyard.push(payoff); h.sequence.checkpoint(1);
  assert.equal(h.points[0].maxFuel, 4); assert.equal(h.damage(), 4);
  assert.equal(h.points[0].fuel, 1); assert.equal(h.banished.length, 4);
  h.sequence.beginTurn(); h.graveyard.push(fire(), fire());
  h.sequence.resolve(crescendo()); h.sequence.checkpoint(2);
  assert.equal(h.damage(), 4, 'previous-turn Melody cannot enable another Harmonize');
  assert.equal(h.points[1].casts, 2); assert.equal(h.points[1].fuel, 0);
  assert.equal(h.banished.length, 7, 'second cast spends new fuel, including the previous resolved source');
});

test('empty-hand optional loot does not draw and field allies are not fuel', () => {
  const h = harness(); h.field.push(songstress(), source('Messenger', { jinFuelRole: 'messenger', fireElement: true }));
  h.sequence.beforePlays(); h.sequence.activate(crescendo()); h.sequence.resolve(source('Courier', { jinFuelRole: 'courier' }));
  assert.equal(h.draws(), 0); assert.equal(h.sequence.canPlay(crescendo()), false);
});

test('Dungeon Guide pays two physical memory cards; Liminal returns once on level-up', () => {
  const h = harness(), guide = source('Dungeon Guide', { jinFuelRole: 'dungeon' });
  h.memory.push(fire()); h.sequence.resolve(guide); assert.equal(h.level(), 0); assert.equal(h.memory.length, 1);
  h.graveyard.push(source('Liminal Guide', { jinFuelRole: 'liminal' })); h.memory.push(fire());
  h.sequence.resolve(guide); assert.equal(h.level(), 1); assert.equal(h.banished.length, 2);
  assert.equal(h.graveyard.length, 0); assert.equal(h.field.length, 1); assert.equal(h.draws(), 1);
  h.sequence.onLevel(); assert.equal(h.draws(), 1);
});

const progression = { rai: false, lineage: [{ name: 'Jin 1', memory: 1 }, { name: 'Jin 2', memory: 2 }, { name: 'Jin 3', memory: 3 }] };
function run(main: InfluenceDrawSource[], attacks = true, turns = 5) {
  const checkpoints: JinFuelCheckpoint[] = [];
  const points = estimateDrawAndDamageInfluence(main, [], 7, 'first', turns, 1, progression, undefined, undefined,
    { messengerAttacks: attacks, checkpoint: point => checkpoints.push(point) });
  const size = main.reduce((n, card) => n + card.quantity, 0);
  for (const p of points) assert.equal(p.hand + p.memory + p.graveyard + p.banished + p.field + p.library, size);
  return { points, checkpoints };
}

test('Messenger attacks begin next turn, are once per copy per turn, and can be disabled', () => {
  const main = [source('Messenger', { jinFuelRole: 'messenger', resolvesTo: 'field' }), source('Fuel', { quantity: 6, fireElement: true })];
  const yes = run(main), no = run(main, false);
  assert.equal(yes.checkpoints[0].discardedFire, 0);
  assert.ok(yes.checkpoints[4].discardedFire > 0);
  assert.ok(yes.checkpoints.every((p, i) => p.discardedFire <= i));
  assert.ok(no.checkpoints.every(p => p.discardedFire === 0));
});

test('Floating Memory and Crescendo consume the same finite Fire graveyard', () => {
  const main = [source('Loot', { jinFuelRole: 'loot', draws: 2, discard: 3, resolvesTo: 'graveyard', fireElement: true }),
    source('Floating fuel', { quantity: 5, fireElement: true, floatingMemory: 'always' }), { ...crescendo(), reserve: 3 }];
  const { points, checkpoints } = run(main);
  assert.ok(points[1].floatingMemoryPaid > 0);
  for (let i = 0; i < points.length; i++) {
    assert.equal(checkpoints[i].fuel, points[i].graveyard);
    assert.ok(checkpoints[i].maxFuel + points[i].floatingMemoryPaid <= main.reduce((n, c) => n + c.quantity, 0));
  }
});

test('Scavenge moves revealed misses to the bottom, never creates graveyard fuel', () => {
  const { points, checkpoints } = run([source('Curator', { jinFuelRole: 'curator', quantity: 8, resolvesTo: 'field' }), source('Miss', { quantity: 30, fireElement: true })]);
  assert.ok(points[0].field > 0, 'a Curator really resolved');
  assert.ok(points.every(p => p.graveyard === 0)); assert.ok(checkpoints.every(p => p.fuel === 0));
  assert.equal(points[4].seen, 11);
});

test('paid simulation conserves all 62 fixture cards, including Curator and Dungeon sequences', () => {
  const policy = createJinFuelPolicy(deck, catalog); assert.equal(policy.status, 'ready');
  if (policy.status !== 'ready') return;
  const points = estimateDrawAndDamageInfluence(policy.main, [], 7, 'first', 5, 512, policy.progression, undefined, undefined, { messengerAttacks: true, checkpoint: () => {} });
  for (const p of points) assert.equal(p.hand + p.memory + p.graveyard + p.banished + p.field + p.library, 62);
});

test('fixture report is deterministic, insensitive to line order/splitting, and excludes sideboard', () => {
  const report = computeJinFuelReport(deck, catalog); assert.equal(report.status, 'ready');
  const split = { ...deck, main: deck.main.flatMap(line => [{ ...line, quantity: 1 }, { ...line, quantity: line.quantity - 1 }]).reverse(), sideboard: [{ name: 'Unknown sideboard', quantity: 100 }] };
  assert.deepEqual(computeJinFuelReport(split, catalog), report);
  if (report.status !== 'ready') return;
  assert.deepEqual(report.points.map(p => p.thresholds[0].chance), [0, 21 / 512, 66 / 512, 108 / 512, 151 / 512]);
  assert.equal(report.points[4].harmonized, 13 / 512);
  for (const p of report.points) {
    assert.ok(p.thresholds[0].chance >= p.thresholds[1].chance && p.thresholds[1].chance >= p.thresholds[2].chance);
    assert.ok(p.harmonized <= p.thresholds[0].chance);
  }
  assert.notDeepEqual(computeJinFuelReport(deck, catalog, false), report);
});

test('missing/unsupported input is unavailable, while a valid deck without enablers produces honest zeros', () => {
  const missing = new Map(catalog); missing.delete('Creative Shock');
  assert.equal(computeJinFuelReport(deck, missing).status, 'missing');
  const badCost = new Map(catalog); badCost.set('Volcanic Crescendo', { ...catalog.get('Volcanic Crescendo')!, cost_reserve: null });
  assert.equal(computeJinFuelReport(deck, badCost).status, 'missing');
  assert.equal(computeJinFuelReport({ ...deck, material: [] }, catalog).status, 'unsupported');
  const wrongSpirit = { ...deck, material: deck.material.map(line => line.name === 'Spirit of Fire' ? { ...line, name: 'Spirit of Water' } : line) };
  assert.equal(computeJinFuelReport(wrongSpirit, catalog).status, 'unsupported');
  const noFuel = computeJinFuelReport({ ...deck, main: [{ name: 'Volcanic Crescendo', quantity: 4 }, { name: 'Fast Cure', quantity: 56 }] }, catalog);
  assert.equal(noFuel.status, 'ready');
  if (noFuel.status === 'ready') assert.ok(noFuel.points.every(p => p.thresholds.every(t => t.chance === 0) && p.fuel.high === 0));
});
