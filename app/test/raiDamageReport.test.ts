import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeRaiDamageReport, compareRaiDamageReports, createRaiDrawPolicy, estimateDrawAndDamageInfluence, type Card, type InfluenceDrawSource } from '@gatcg/shared';

const catalog = new Map<string, Card>(JSON.parse(readFileSync(new URL('../../data/card-catalog.json', import.meta.url), 'utf8')).cards.map((card: Card) => [card.name, card]));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/rai-fire-draw.json', import.meta.url), 'utf8'));
const lines = (section: Record<string, number>) => Object.entries(section).map(([name, quantity]) => ({ name, quantity }));
const deck = { main: lines(fixture.main), material: lines(fixture.material) };
const progression = { rai: true as const, lineage: [{ name: 'One', memory: 1 }, { name: 'Two', memory: 2 }, { name: 'Three', memory: 3 }] };
const fireball: InfluenceDrawSource = { name: 'Fireball', quantity: 30, reserve: 4, draws: 0, discard: 0, mageAction: true, mechanic: 'fireball' };

test('Fireball pays full spirit cost, discounted Mage cost, and uses paid level', () => {
  const points = estimateDrawAndDamageInfluence([fireball], [], 7, 'first', 5, 1, progression);
  assert.deepEqual(points.slice(0, 3).map(point => point.paidDamageRange.median), [1, 5, 8]);
  assert.equal(points[0].memory, 4);
  assert.equal(points[1].memory, 4);
  const blocked = estimateDrawAndDamageInfluence([fireball], [], 7, 'first', 5, 1, { ...progression, lineage: [{ name: 'Blocked', memory: 100 }] });
  assert.deepEqual(blocked.slice(0, 3).map(point => point.paidDamageRange.median), [1, 2, 3]);
  const unaffordable = estimateDrawAndDamageInfluence([{ ...fireball, reserve: 100 }], [], 7, 'first', 5, 1, progression);
  assert.ok(unaffordable.every(point => point.paidDamageRange.high === 0));
});

test('physical Fireball copies resolve only once; damage cannot exceed finite copies and level', () => {
  const points = estimateDrawAndDamageInfluence([{ ...fireball, quantity: 7 }], [], 7, 'first', 5, 1, progression);
  assert.ok(points.every(point => point.paidDamageRange.high <= 28));
  // With no natural cards left, only two copies can be paid before resources run out.
  assert.equal(points[4].paidDamageRange.median, 3);
});

test('real fixture paired ranges agree, are deterministic and do not alter the draw policy', () => {
  const report = computeRaiDamageReport(deck, catalog);
  assert.equal(report.status, 'ready');
  if (report.status !== 'ready') return;
  assert.deepEqual(report, computeRaiDamageReport({ ...deck, main: [...deck.main].reverse() }, catalog));
  assert.deepEqual(report.damageSources, [{ name: 'Fireball', quantity: 4 }]);
  assert.ok(report.points[4].damage.high > 0);
  const target = { ...deck, main: deck.main.filter(line => line.name !== 'Fireball') };
  const comparison = compareRaiDamageReports(deck, target, catalog);
  assert.equal(comparison.status, 'ready');
  if (comparison.status !== 'ready') return;
  assert.deepEqual(comparison.points.map(point => point.before), [report.points[2].damage, report.points[4].damage]);
  assert.ok(comparison.points.every(point => point.after.high === 0));
  assert.equal(createRaiDrawPolicy(deck.main, deck.material, catalog)!.main.find(source => source.name === 'Fireball')!.mechanic, undefined);
});

test('off-element Fireball cannot activate; incomplete and unsupported decks are not zeros', () => {
  const water = { ...deck, material: deck.material.map(line => line.name === 'Spirit of Fire' ? { ...line, name: 'Spirit of Water' } : line) };
  const result = computeRaiDamageReport(water, catalog);
  assert.equal(result.status, 'ready');
  if (result.status === 'ready') assert.ok(result.points.every(point => point.damage.high === 0));
  const missing = new Map(catalog); missing.delete('Fireball');
  assert.equal(compareRaiDamageReports(deck, deck, missing).status, 'missing');
  assert.equal(compareRaiDamageReports(deck, { ...deck, material: [] }, catalog).status, 'unsupported');
  assert.equal(catalog.get('Fireball')!.cost_reserve, 4);
  assert.match(catalog.get('Fireball')!.effect!, /Class Bonus.*costs 2 less/);
  assert.match(catalog.get('Fireball')!.effect!, /Deal 1\+\*\*LV\*\* damage to target unit/);
  assert.ok(!catalog.get('Spirit of Fire')!.classes.includes('MAGE'));
});
