import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimateDrawAndDamageInfluence, estimateDrawInfluence, createRaiDrawPolicy, type Card, type InfluenceDrawSource } from '@gatcg/shared';

const progression = { rai: true as const, lineage: [{ name: 'One', memory: 1 }, { name: 'Two', memory: 2 }, { name: 'Three', memory: 3 }] };
const action: InfluenceDrawSource = { name: 'Reviewed action', quantity: 7, reserve: 1, draws: 0, discard: 0, mechanic: 'gilded-pyre', resolvesTo: 'graveyard', floatingMemory: 'mage' };
const run = (main: InfluenceDrawSource[], policy = progression, turns = 5) => estimateDrawAndDamageInfluence(main, [], 7, 'first', turns, 1, policy);
const conserved = (points: ReturnType<typeof run>, size: number) => {
  for (const point of points) assert.equal(point.hand + point.memory + point.graveyard + point.banished + point.field + point.library, size);
};

test('class-qualified Floating Memory checks the outgoing champion and consumes each graveyard copy once', () => {
  const points = run([action]);
  assert.equal(points[0].graveyard, 3);
  assert.equal(points[1].paidLevel, 1);
  assert.equal(points[1].floatingMemoryPaid, 0); // Spirit cannot borrow the incoming Mage class.
  assert.equal(points[2].paidLevel, 2);
  assert.equal(points[2].floatingMemoryPaid, 2);
  assert.equal(points[4].floatingMemoryPaid, 5);
  assert.ok(points.every(point => point.floatingMemoryPaid <= point.paidDamageRange.median / 2));
  conserved(points, 7);
  const noFloating = run([{ ...action, floatingMemory: undefined }]);
  assert.ok(points[2].paidLevel > noFloating[2].paidLevel);
});

test('unconditional Floating Memory can pay first materialization; failed costs consume nothing', () => {
  const always = { ...action, floatingMemory: 'always' as const };
  const points = run([always], { ...progression, lineage: [{ name: 'One', memory: 4 }] }, 2);
  assert.equal(points[1].paidLevel, 1);
  assert.equal(points[1].floatingMemoryPaid, 3);
  assert.equal(points[1].banished, 4);
  const blocked = run([always], { ...progression, lineage: [{ name: 'One', memory: 7 }] }, 2);
  assert.equal(blocked[1].paidLevel, 0);
  assert.equal(blocked[1].floatingMemoryPaid, 0);
  assert.equal(blocked[1].banished, 0);
  conserved(points, 7); conserved(blocked, 7);
});

test('cards in hand, memory or field cannot supply Floating Memory; graveyard cannot pay reserve', () => {
  const field = run([{ ...action, resolvesTo: 'field', floatingMemory: 'always' }]);
  assert.ok(field.every(point => point.floatingMemoryPaid === 0));
  conserved(field, 7);
  const expensive = run([{ ...action, reserve: 8, floatingMemory: 'always' }]);
  assert.ok(expensive.every(point => point.graveyard === 0 && point.paidLevel === 0));
  const finite = run([{ ...action, floatingMemory: 'always' }], { ...progression, lineage: [] });
  assert.equal(finite[4].paidDamageRange.median, 12); // Six casts; last card cannot pay itself.
  assert.equal(finite[4].hand, 1);
  assert.equal(finite[4].graveyard, 6);
  conserved(finite, 7);
});

test('discards enter the graveyard and delayed sacrifices cannot fund earlier materialization', () => {
  const discard = run([{ ...action, discard: 1, floatingMemory: 'always' }], { ...progression, lineage: [] }, 1);
  assert.equal(discard[0].graveyard, 4); // Two resolved Actions and two discarded physical cards.
  conserved(discard, 7);
  const delayed = run([{ ...action, mechanic: 'recollection-hand', resolvesTo: 'field', floatingMemory: 'always' }], { ...progression, lineage: [{ name: 'One', memory: 4 }] }, 3);
  assert.equal(delayed[1].paidLevel, 0); // Three reserve cards; sacrifices are later this turn.
  assert.equal(delayed[1].floatingMemoryPaid, 0);
  assert.equal(delayed[2].paidLevel, 1);
  assert.ok(delayed[2].floatingMemoryPaid > 0);
  conserved(delayed, 7);
});

test('real Rai fixture preserves draw contract while accounting for physical main-deck zones', () => {
  const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/rai-fire-draw.json', import.meta.url), 'utf8'));
  const lines = (values: Record<string, number>) => Object.entries(values).map(([name, quantity]) => ({ name, quantity }));
  const policy = createRaiDrawPolicy(lines(fixture.main), lines(fixture.material), catalog)!;
  const points = estimateDrawAndDamageInfluence(policy.main, [], 7, 'first', 5, 512, policy.progression);
  conserved(points, 60);
  assert.ok(points.every(point => point.floatingMemoryPaid === 0));
  const legacy = estimateDrawInfluence(policy.main, [], 7, 'first', 5, 512, policy.progression);
  assert.deepEqual(legacy.map(point => point.seenRange), points.map(point => point.seenRange));
  assert.ok(!('graveyard' in legacy[0]));
  assert.equal(policy.main.find(source => source.name === 'Indolent Leisure')!.resolvesTo, 'graveyard');
  assert.equal(policy.main.find(source => source.name === 'Academy Guide')!.resolvesTo, 'field');
});

test('a single graveyard copy pays once and a zero memory cost never consumes it', () => {
  const single = { ...action, quantity: 1, reserve: 0, floatingMemory: 'always' as const };
  const points = run([single], { ...progression, lineage: [{ name: 'One', memory: 1 }, { name: 'Two', memory: 1 }] });
  assert.deepEqual(points.map(point => point.paidLevel), [0, 1, 1, 1, 1]);
  assert.equal(points[4].floatingMemoryPaid, 1);
  assert.equal(points[4].banished, 1);
  assert.equal(points[4].graveyard, 0);
  conserved(points, 1);
  const free = run([single], { ...progression, lineage: [{ name: 'One', memory: 0 }] });
  assert.equal(free[4].floatingMemoryPaid, 0);
  assert.equal(free[4].graveyard, 1);
  conserved(free, 1);
});
